package main

import (
    "fmt"
    "os"
    "strings"
    "encoding/json"
    goauth2 "golang.org/x/oauth2"
    "golang.org/x/oauth2/clientcredentials"
)

// ConfigFile 環境設定構造体
type ConfigFile struct {
    Host        HostConf        `json:"host"`
    OicdClientRaw  OicdClientConf  `json:"oidc_client"`
    OidcClient  goauth2.Config   `json:"-"`
    OidcApp     clientcredentials.Config    `json:"-"`
}


// HostConf 環境設定-ホスト設定構造体
type HostConf struct {
    Host        string      `json:"host"`
    Port        uint        `json:"port"`
}

type OicdClientConf struct {
    ClientID    string      `json:"client_id"`
    Secret      string     `json:"secret"`
    Scopes      string      `json:"scopes"`
    RedirectURL string      `json:"redirect_url"`
    AuthURL     string      `json:"auth_url"`
    TokenURL    string      `json:"token_url"`
}

// ConfigLoad 設定ファイルの読み込み
func ConfigLoad() (ConfigFile, error){

    var conf ConfigFile

    env := os.Getenv("APICONF")

    err := json.Unmarshal([]byte(env), &conf);
    if  err != nil {
        fmt.Println("Config env Unmarshal error:", err)
    }

    scopes := strings.Split(conf.OicdClientRaw.Scopes, ",")
    for i, s := range scopes {
        scopes[i] = strings.TrimSpace(s)
    }

    conf.OidcClient = goauth2.Config{
        ClientID:     conf.OicdClientRaw.ClientID,
        ClientSecret: conf.OicdClientRaw.Secret,
        RedirectURL: conf.OicdClientRaw.RedirectURL,
        Scopes:       scopes,
        Endpoint: goauth2.Endpoint{
            TokenURL: conf.OicdClientRaw.TokenURL,
            AuthURL:  conf.OicdClientRaw.AuthURL,
        },
    }

    conf.OidcApp = clientcredentials.Config{
        ClientID:     conf.OicdClientRaw.ClientID,
        ClientSecret: conf.OicdClientRaw.Secret,
        Scopes:       scopes,
        TokenURL:     conf.OicdClientRaw.TokenURL,
    }

    return conf, err
}
