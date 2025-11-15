package controller

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"chillow/adminstream"
	"chillow/db"
	"chillow/model"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func ReportMessageHandler(c *gin.Context) {
	userID := c.GetUint("user_id")
	messageID, err := strconv.Atoi(c.Param("id"))
	if err != nil || messageID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid message id"})
		return
	}

	var body struct {
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	reason := strings.TrimSpace(body.Reason)
	if reason == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "理由を入力してください"})
		return
	}

	var msg model.Message
	if err := db.DB.First(&msg, messageID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load message"})
		return
	}

	if msg.SenderID == userID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "自分のメッセージは通報できません"})
		return
	}
	if msg.ReceiverID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "このメッセージを通報する権限がありません"})
		return
	}

	var existing model.Report
	if err := db.DB.Where("message_id = ? AND reporter_id = ? AND status = ?", msg.ID, userID, "pending").
		First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "既に通報済みです"})
		return
	} else if err != nil && err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check reports"})
		return
	}

	report := model.Report{
		ReporterID:     userID,
		ReportedUserID: msg.SenderID,
		MessageID:      msg.ID,
		MessageContent: msg.Content,
		MessageType:    msg.MessageType,
		AttachmentURL:  msg.AttachmentURL,
		AttachmentObj:  msg.AttachmentObj,
		Reason:         reason,
		Status:         "pending",
	}
	if err := db.DB.Create(&report).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create report"})
		return
	}

	if err := db.DB.Preload("Reporter").Preload("ReportedUser").First(&report, report.ID).Error; err != nil {
		log.Printf("⚠️ failed to preload report: %v", err)
	} else {
		adminstream.Broadcast(adminstream.Event{Type: "report:new", Report: &report})
	}

	c.JSON(http.StatusCreated, report)
}
