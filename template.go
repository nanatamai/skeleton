package main

import (
    "fmt"
    "io/ioutil"
	"strings"
    "bytes"
    "time"
    "net/http"
    "net/url"
    "html/template"
    "encoding/json"
    goauth2 "golang.org/x/oauth2"
    "github.com/parnurzeal/gorequest"

	"github.com/labstack/echo"
	"github.com/labstack/echo/engine/standard"
)


func templateRoute(e *echo.Echo, conf *goauth2.Config) {

    e.GET("/callback.html", assetsHandler("assets/template/callback.html", conf))
}

func assetsHandler(path string, conf *goauth2.Config) echo.HandlerFunc {

	extension := strings.Split(path, ".")
	contentMap := map[string] string {
        "html": "text/html",
		"js": "application/x-javascript;",
		"css": "text/css",
		"png": "image/png",
	}
	templateMap := map[string] func(src []byte, conf *goauth2.Config, req *http.Request) ([]byte) {
		"assets/template/callback.html": callbackHtmlTemplate,
	}

	contentType, ok := contentMap[extension[len(extension) - 1]]

	return func(c echo.Context) error {

		status := http.StatusOK
        src, err := ioutil.ReadFile(path)

//		src, err := Asset(path)

		if err != nil || !ok {

			status = http.StatusNotFound
			contentType = "text/plain"
			src = []byte("404 Not found")
		} else {

			c.Request()

			// template実行
			_, tmpparse := templateMap[path]
			if(tmpparse) {
				src = templateMap[path](src, conf, c.Request().(*standard.Request).Request)
			}
		}

		return c.Blob(status, contentType, src)
	}
}

func executeTemplate(src []byte, data interface{}) []byte {

	html := new(bytes.Buffer)

	tpl := template.Must(template.New("").Parse(string(src)))
	err2 := tpl.Execute(html, data)

	if err2 != nil {
		fmt.Printf("html parse error\n")
		html.Write([]byte("html parse error"))
	}

	return html.Bytes()
}

func callbackHtmlTemplate(src []byte, conf *goauth2.Config, req *http.Request) []byte {

	type tokenStruct struct {
		ClientID string		`json:"client_id"`
		Token struct {
			Error string	`json:"error,omitempty"`
			AuthorizeCode string	`json:"authorize_code,omitempty"`
			AccessToken string		`json:"access_token,omitempty"`
			RefreshToken string		`json:"refresh_token,omitempty"`
			ExtraInfo	 string		`json:"extra_token,omitempty"`
			ExpiresString	time.Time	`json:"expires_string,omitempty"`
			UserID		string		`json:"user_id,omitempty"`
		}
	}

    var tpl tokenStruct

    tpl.ClientID = conf.ClientID

    // エラー判定
    if req.URL.Query().Get("error") != "" {

        tpl.Token.Error = req.URL.Query().Get("error_description")

        return executeTemplate(src, tpl)
    }

    authorizeCode := req.URL.Query().Get("code")

    if authorizeCode == "" {

        tpl.Token.Error = "Could not find the authorize code."
        return executeTemplate(src, tpl)
    }

    exchaneErr := ""

    // AccessTokenを取得する
    token, err := conf.Exchange(goauth2.NoContext, authorizeCode)
    if err != nil {
        exchaneErr = err.Error()
        fmt.Printf("authorize code error : %s\n", exchaneErr)
    } else {

		userID := ""

		rawScope := req.URL.Query().Get("scope")
		scopes := strings.Split(rawScope, " ")
		for _, scope := range scopes {
			
			if strings.Contains(scope, "user.") {
				userID = strings.Split(scope, ".")[1]
			}
		}

//        tokenJson, _ := json.Marshal(token)
		idToken, _ := token.Extra("id_token").(string)

        tpl.Token.AuthorizeCode = authorizeCode
        tpl.Token.AccessToken = token.AccessToken
        tpl.Token.RefreshToken = token.RefreshToken
        tpl.Token.ExtraInfo = idToken
        tpl.Token.ExpiresString = token.Expiry
		tpl.Token.UserID = userID
    }

    // error set
    tpl.Token.Error = exchaneErr
    
    return executeTemplate(src, tpl)
}

func tokenHandler(conf *goauth2.Config) echo.HandlerFunc {

	return func(c echo.Context) error {

		req := c.Request().(*standard.Request).Request
		status := http.StatusOK
		var retjson map[string]interface{}

		if req.FormValue("refresh") != "" {
			_, body, errs := gorequest.New().Post(conf.Endpoint.TokenURL).SetBasicAuth(conf.ClientID, conf.ClientSecret).SendString(url.Values{
				"grant_type":    {"refresh_token"},
				"refresh_token": {req.FormValue("refresh")},
				"scope":         {"fosite"},
				"nonce":		{"12345678901234567890"},
			}.Encode()).End()

			if len(errs) > 0 {
				retjson["error"] = errs
				status = http.StatusBadRequest
			} else {

//				var tokenJson interface{}
				err := json.Unmarshal([]byte(body), &retjson)
				if(err != nil){
					retjson["error"] = err
					status = http.StatusBadRequest
				}

				_, ok := retjson["statusCode"]
				if(ok) {
					status = int(retjson["statusCode"].(float64))
				}
			}
		} else {
			retjson["error"] = "No Query"
			status = http.StatusBadRequest
		}

		return c.JSON(status, retjson)
	}

	
}