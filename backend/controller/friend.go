package controller

import (
	"chillow/db"
	"chillow/model"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func	SendFriendRequestHandler(c *gin.Context) {
	var req model.FriendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// 自分自身への申請は禁止
	if req.SenderID == req.ReceiverID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot send request to yourself"})
		return
	}

	// すでに pending のリクエストがあるか確認
	exists, err := model.PendingRequestExists(req.SenderID, req.ReceiverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if exists {
		c.JSON(http.StatusConflict, gin.H{"error": "Request already sent"})
		return
	}

	// すでにフレンドか確認
	isFriend, err := model.AreFriends(req.SenderID, req.ReceiverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if isFriend {
		c.JSON(http.StatusConflict, gin.H{"error": "Already friends"})
		return
	}

	// 通常の登録
	req.Status = "pending"
	if err := db.DB.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}
	c.JSON(http.StatusOK, req)
}

func	GetFriendRequestsHandler(c *gin.Context) {
	var requests []model.FriendRequest
	if err := db.DB.Find(&requests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch requests"})
		return
	}
	c.JSON(http.StatusOK, requests)
}

func	RespondToFriendRequestHandler(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req model.FriendRequest
	if err := db.DB.First(&req, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}

	var body struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || (body.Status != "accepted" && body.Status != "declined") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	req.Status = body.Status
	if err := db.DB.Save(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
		return
	}

	// フレンド関係作成
	if body.Status == "accepted" {
		friend1 := model.Friend{UserID: req.SenderID, FriendID: req.ReceiverID}
		friend2 := model.Friend{UserID: req.ReceiverID, FriendID: req.SenderID}
		db.DB.Create(&friend1)
		db.DB.Create(&friend2)
	}
	c.JSON(http.StatusOK, req)
}

func	GetFriendsHandler(c *gin.Context) {
	userID := c.GetUint("user_id")
	var friends []model.Friend
	if err := db.DB.Where("user_id = ?", userID).Find(&friends).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get friends"})
		return
	}
	c.JSON(http.StatusOK, friends)
}

func	DeleteFriendHandler(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetUint("user_id")

	// 双方向削除
	db.DB.Where("user_id = ? AND friend_id = ?", userID, id).Delete(&model.Friend{})
	db.DB.Where("user_id = ? AND friend_id = ?", id, userID).Delete(&model.Friend{})

	c.JSON(http.StatusOK, gin.H{"message": "Friend deleted"})
}
