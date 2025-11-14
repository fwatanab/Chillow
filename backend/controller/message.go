package controller

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"chillow/config"
	"chillow/db"
	"chillow/model"
	"chillow/ws"

	"github.com/gin-gonic/gin"
)

const (
	maxMessageLength       = 2000
	maxAttachmentSizeBytes = 8 * 1024 * 1024 // 8MB
)

var allowedAttachmentExtensions = map[string]struct{}{
	".jpg":  {},
	".jpeg": {},
	".png":  {},
	".gif":  {},
	".webp": {},
}

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

	var toMark []*model.Message
	for i := range messages {
		msg := &messages[i]
		if msg.ReceiverID == userID && !msg.IsRead {
			toMark = append(toMark, msg)
		}
	}

	if len(toMark) > 0 {
		if err := db.DB.Model(&model.Message{}).
			Where("receiver_id = ? AND sender_id = ? AND is_read = ?", userID, friendID, false).
			Update("is_read", true).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark as read"})
			return
		}
		for _, msg := range toMark {
			msg.IsRead = true
			broadcastMessageEvent("message:read", *msg)
		}
	}

	c.JSON(http.StatusOK, messages)
}

func PostMessageHandler(c *gin.Context) {
	senderID := c.GetUint("user_id")

	var req struct {
		ReceiverID    uint    `json:"receiver_id"`
		Content       string  `json:"content"`
		MessageType   string  `json:"message_type"`
		AttachmentURL *string `json:"attachment_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if req.ReceiverID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "receiver_id is required"})
		return
	}

	messageType := strings.ToLower(strings.TrimSpace(req.MessageType))
	if messageType == "" {
		messageType = "text"
	}

	trimmedContent := strings.TrimSpace(req.Content)
	switch messageType {
	case "text":
		if trimmedContent == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
			return
		}
	case "sticker":
		if trimmedContent == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "sticker payload is required"})
			return
		}
	case "image":
		if req.AttachmentURL == nil || strings.TrimSpace(*req.AttachmentURL) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "attachment_url is required for images"})
			return
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported message_type"})
		return
	}

	if len([]rune(trimmedContent)) > maxMessageLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is too long"})
		return
	}

	var normalizedAttachment *string
	if req.AttachmentURL != nil {
		url := strings.TrimSpace(*req.AttachmentURL)
		if url != "" {
			normalizedAttachment = &url
		}
	}

	now := time.Now()
	msg := model.Message{
		SenderID:      senderID,
		ReceiverID:    req.ReceiverID,
		Content:       trimmedContent,
		MessageType:   messageType,
		AttachmentURL: normalizedAttachment,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := db.DB.Create(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}
	c.JSON(http.StatusOK, msg)
}

func UploadMessageMediaHandler(c *gin.Context) {
	userID := c.GetUint("user_id")
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	if file.Size > maxAttachmentSizeBytes {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is too large"})
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if _, ok := allowedAttachmentExtensions[ext]; !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported file type"})
		return
	}

	filenameSuffix, err := randomHex(6)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to allocate filename"})
		return
	}
	filename := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), filenameSuffix, ext)
	destDir := filepath.Join("uploads", "chat", strconv.FormatUint(uint64(userID), 10))
	if err := os.MkdirAll(destDir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to prepare directory"})
		return
	}
	destPath := filepath.Join(destDir, filename)
	if err := c.SaveUploadedFile(file, destPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}

	publicPath := filepath.ToSlash(filepath.Join("/uploads", "chat", strconv.FormatUint(uint64(userID), 10), filename))
	fileURL := strings.TrimRight(config.Cfg.BackendURL, "/") + publicPath
	c.JSON(http.StatusOK, gin.H{"url": fileURL, "path": publicPath})
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
	broadcastMessageEvent("message:read", msg)
	c.JSON(http.StatusOK, msg)
}

func UpdateMessageHandler(c *gin.Context) {
	userID := c.GetUint("user_id")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var body struct {
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	var msg model.Message
	if err := db.DB.First(&msg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}

	if msg.SenderID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not allowed"})
		return
	}
	if msg.IsDeleted {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot edit deleted message"})
		return
	}

	trimmed := strings.TrimSpace(body.Content)
	if msg.MessageType != "image" {
		if trimmed == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
			return
		}
		if len([]rune(trimmed)) > maxMessageLength {
			c.JSON(http.StatusBadRequest, gin.H{"error": "content is too long"})
			return
		}
	}

	msg.Content = trimmed
	now := time.Now()
	msg.EditedAt = &now
	msg.UpdatedAt = now
	if err := db.DB.Save(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update message"})
		return
	}
	c.JSON(http.StatusOK, msg)
}

func DeleteMessageHandler(c *gin.Context) {
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

	if msg.SenderID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not allowed"})
		return
	}
	if msg.IsDeleted {
		c.JSON(http.StatusOK, msg)
		return
	}

	now := time.Now()
	msg.IsDeleted = true
	msg.DeletedAt = &now
	msg.AttachmentURL = nil
	msg.Content = ""
	msg.UpdatedAt = now
	if err := db.DB.Save(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete message"})
		return
	}
	c.JSON(http.StatusOK, msg)
}

func broadcastMessageEvent(eventType string, msg model.Message) {
	if hub == nil {
		return
	}
	roomID := ws.BuildRoomID(msg.SenderID, msg.ReceiverID)
	event := ws.MessageEvent{
		Type:    eventType,
		RoomID:  roomID,
		Message: ws.BuildMessageDTO(roomID, msg),
	}
	bytes, err := json.Marshal(event)
	if err != nil {
		log.Printf("⚠️ failed to marshal %s event: %v", eventType, err)
		return
	}
	hub.Broadcast(roomID, bytes)
}

func randomHex(length int) (string, error) {
	buf := make([]byte, length)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
