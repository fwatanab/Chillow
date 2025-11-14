package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func AdminHealthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "admin endpoint reachable",
	})
}
