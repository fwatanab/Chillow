package controller

import (
	"chillow/db"
	"chillow/model"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func	GetMessagesHandler(c *gin.Context) {
	userID := c.GetUint("user_id")
	friendID, _ := strconv.Atoi(c.Param("friend_id"))

	var messages []model.Message
	if err := db.DB.Where(
		"(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
		userID, friendID, friendID, userID,
	).Order("created_at asc").Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}
	c.JSON(http.StatusOK, messages)
}

func	PostMessageHandler(c *gin.Context) {
	var msg model.Message
	if err := c.ShouldBindJSON(&msg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	msg.CreatedAt = time.Now()
	if err := db.DB.Create(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}
	c.JSON(http.StatusOK, msg)
}

func	MarkMessageAsReadHandler(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var msg model.Message
	if err := db.DB.First(&msg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}
	msg.IsRead = true
	if err := db.DB.Save(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark as read"})
		return
	}
	c.JSON(http.StatusOK, msg)
}
