package controller

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"chillow/adminstream"
	"chillow/db"
	"chillow/model"
	"chillow/ws"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func AdminHealthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "admin endpoint reachable"})
}

func AdminEventsHandler(c *gin.Context) {
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "stream not supported"})
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	ch, cancel := adminstream.Subscribe()
	defer cancel()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	notify := c.Request.Context().Done()

	for {
		select {
		case evt, ok := <-ch:
			if !ok {
				return
			}
			data, err := json.Marshal(evt)
			if err != nil {
				continue
			}
			if _, err := c.Writer.Write([]byte("data: " + string(data) + "\n\n")); err != nil {
				return
			}
			flusher.Flush()
		case <-ticker.C:
			if _, err := c.Writer.Write([]byte(": keep-alive\n\n")); err != nil {
				return
			}
			flusher.Flush()
		case <-notify:
			return
		}
	}
}

func AdminBanUserHandler(c *gin.Context) {
	adminID := c.GetUint("user_id")
	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil || targetID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var req struct {
		Reason        string `json:"reason"`
		DurationHours *int   `json:"duration_hours"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}
	reason := strings.TrimSpace(req.Reason)
	if reason == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ban reason is required"})
		return
	}

	var user model.User
	if err := db.DB.First(&user, targetID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user"})
		return
	}

	if user.ID == adminID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot ban yourself"})
		return
	}
	if user.Role == "admin" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot ban another admin"})
		return
	}

	if err := applyBan(&user, reason, req.DurationHours); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to ban user"})
		return
	}
	if err := db.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to ban user"})
		return
	}
	ws.DisconnectUser(user.ID, reason)
	adminstream.Broadcast(adminstream.Event{Type: "user:banned", User: &user})

	c.JSON(http.StatusOK, gin.H{
		"message":      "user banned",
		"banned_until": user.BanExpiresAt,
	})
}

func AdminUnbanUserHandler(c *gin.Context) {
	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil || targetID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var user model.User
	if err := db.DB.First(&user, targetID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user"})
		return
	}

	user.ClearBan()
	if err := db.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to unban user"})
		return
	}
	adminstream.Broadcast(adminstream.Event{Type: "user:unbanned", User: &user})

	c.JSON(http.StatusOK, gin.H{"message": "user unbanned"})
}

func AdminListReportsHandler(c *gin.Context) {
	status := c.DefaultQuery("status", "pending")
	query := db.DB.Preload("Reporter").Preload("ReportedUser").Preload("HandledByUser")
	if status != "all" {
		query = query.Where("status = ?", status)
	}
	var reports []model.Report
	if err := query.Order("created_at ASC").Find(&reports).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load reports"})
		return
	}
	c.JSON(http.StatusOK, reports)
}

func AdminResolveReportHandler(c *gin.Context) {
	adminID := c.GetUint("user_id")
	reportID, err := strconv.Atoi(c.Param("id"))
	if err != nil || reportID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid report id"})
		return
	}

	var body struct {
		Action        string `json:"action"` // ban or reject
		Note          string `json:"note"`
		BanReason     string `json:"ban_reason"`
		DurationHours *int   `json:"duration_hours"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	action := strings.ToLower(strings.TrimSpace(body.Action))
	if action != "ban" && action != "reject" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid action"})
		return
	}

	var report model.Report
	if err := db.DB.First(&report, reportID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "report not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load report"})
		return
	}
	if report.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "report already resolved"})
		return
	}

	now := time.Now()
	resolution := action
	note := strings.TrimSpace(body.Note)
	if action == "ban" {
		banReason := strings.TrimSpace(body.BanReason)
		if banReason == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ban_reason is required"})
			return
		}
		var user model.User
		if err := db.DB.First(&user, report.ReportedUserID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "reported user not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user"})
			return
		}
		if user.Role == "admin" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "cannot ban another admin"})
			return
		}
		if err := applyBan(&user, banReason, body.DurationHours); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to ban user"})
			return
		}
		if err := db.DB.Save(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to ban user"})
			return
		}
		ws.DisconnectUser(user.ID, banReason)
		note = fmt.Sprintf("BAN: %s", banReason)
	}

	report.Status = "resolved"
	report.Resolution = &resolution
	if note != "" {
		report.ResolutionNote = &note
	}
	report.HandledBy = &adminID
	report.HandledAt = &now
	if err := db.DB.Save(&report).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update report"})
		return
	}
	if err := db.DB.Preload("Reporter").Preload("ReportedUser").Preload("HandledByUser").First(&report, report.ID).Error; err == nil {
		adminstream.Broadcast(adminstream.Event{Type: "report:resolved", Report: &report})
	}
	cleanupAttachmentEvidence(report.MessageID, report.AttachmentObj)
	c.JSON(http.StatusOK, report)
}

func AdminListBannedUsersHandler(c *gin.Context) {
	var users []model.User
	if err := db.DB.Where("is_banned = ?", true).Order("banned_at DESC").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch banned users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

func applyBan(user *model.User, reason string, durationHours *int) error {
	now := time.Now()
	user.IsBanned = true
	user.BannedAt = &now
	user.BanReason = &reason
	if durationHours != nil && *durationHours > 0 {
		expires := now.Add(time.Duration(*durationHours) * time.Hour)
		user.BanExpiresAt = &expires
	} else {
		user.BanExpiresAt = nil
	}
	return nil
}
