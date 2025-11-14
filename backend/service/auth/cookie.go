package auth

import (
	"net/http"
	"time"

	"chillow/config"

	"github.com/gin-gonic/gin"
)

func SetAuthCookie(c *gin.Context, token string, expiresAt time.Time) {
	maxAge := int(time.Until(expiresAt).Seconds())
	if maxAge < 0 {
		maxAge = 0
	}
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		AccessTokenCookieName,
		token,
		maxAge,
		"/",
		config.Cfg.CookieDomain,
		config.Cfg.CookieSecure,
		true,
	)
}

func ClearAuthCookie(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		AccessTokenCookieName,
		"",
		-1,
		"/",
		config.Cfg.CookieDomain,
		config.Cfg.CookieSecure,
		true,
	)
}
