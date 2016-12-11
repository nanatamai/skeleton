package main

import (

	"strconv"

	"github.com/labstack/echo"
	"github.com/labstack/echo/engine/standard"

)

func main() {

	// config file load
	config, err := ConfigLoad()
	if err != nil {
		panic("Config File Load Error")
	}

	e := echo.New()


	// assets
	e.Static("/", "assets/public")

    templateRoute(e, &config.OidcClient)
	

	// Start web server
	e.Run(standard.New(":" + strconv.FormatUint(uint64(config.Host.Port), 10)))
}