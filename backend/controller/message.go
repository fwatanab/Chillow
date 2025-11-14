package controller

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"chillow/db"
	"chillow/model"

	"github.com/gin-gonic/gin"
)

func GetMessagesHandler(c *gin.Context) {
	userID := c.GetUint("user_id")
	friendID, err := strconv.Atoi(c.Param("friend_id"))
	if err != nil || friendID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid friend id"})
		return
	}

	var messages []model.Message
	if err := db.DB.Where(
		"(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
		userID, friendID, friendID, userID,
	).Order("created_at asc").Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}

	// 自分宛の未読は取得と同時に既読化
	db.DB.Model(&model.Message{}).
		Where("receiver_id = ? AND sender_id = ? AND is_read = ?", userID, friendID, false).
		Update("is_read", true)

	c.JSON(http.StatusOK, messages)
}

func PostMessageHandler(c *gin.Context) {
	senderID := c.GetUint("user_id")

	var req struct {
		ReceiverID uint   `json:"receiver_id"`
		Content    string `json:"content"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if req.ReceiverID == 0 || strings.TrimSpace(req.Content) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "receiver_id と content は必須です"})
		return
	}

	msg := model.Message{
		SenderID:   senderID,
		ReceiverID: req.ReceiverID,
		Content:    strings.TrimSpace(req.Content),
		CreatedAt:  time.Now(),
	}

	if err := db.DB.Create(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}
	c.JSON(http.StatusOK, msg)
}

func MarkMessageAsReadHandler(c *gin.Context) {
	userID := c.GetUint("user_id")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var msg model.Message
	if err := db.DB.First(&msg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}

	if msg.ReceiverID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not allowed"})
		return
	}

	if msg.IsRead {
		c.JSON(http.StatusOK, msg)
		return
	}

	msg.IsRead = true
	if err := db.DB.Save(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark as read"})
		return
	}
	c.JSON(http.StatusOK, msg)
}
