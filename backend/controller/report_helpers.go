package controller

import (
	"log"

	"chillow/db"
	"chillow/model"
	"chillow/storage"
)

func hasPendingReports(messageID uint) bool {
	if messageID == 0 {
		return false
	}
	var count int64
	if err := db.DB.Model(&model.Report{}).Where("message_id = ? AND status = ?", messageID, "pending").Count(&count).Error; err != nil {
		log.Printf("⚠️ failed to count reports: %v", err)
		return false
	}
	return count > 0
}

func cleanupAttachmentEvidence(messageID uint, attachmentObj *string) {
	if messageID == 0 || hasPendingReports(messageID) {
		return
	}
	key := ""
	messageDeleted := false
	var msg model.Message
	if err := db.DB.Select("id", "is_deleted", "attachment_object").First(&msg, messageID).Error; err == nil {
		messageDeleted = msg.IsDeleted
		if msg.AttachmentObj != nil && *msg.AttachmentObj != "" {
			key = *msg.AttachmentObj
		}
	}
	if attachmentObj != nil && *attachmentObj != "" {
		key = *attachmentObj
	}
	if key == "" {
		return
	}
	if err := storage.Default().Delete(key); err != nil {
		log.Printf("⚠️ failed to delete attachment evidence: %v", err)
	}
	if messageDeleted {
		if err := db.DB.Model(&model.Message{}).Where("id = ?", messageID).Updates(map[string]interface{}{
			"attachment_url":    nil,
			"attachment_object": nil,
		}).Error; err != nil {
			log.Printf("⚠️ failed to clear attachment columns: %v", err)
		}
	}
}
