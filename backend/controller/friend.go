package controller

import (
	"net/http"
	"strconv"

	"chillow/db"
	"chillow/model"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"log"
)

// POST /api/friend-requests
func SendFriendRequestHandler(c *gin.Context) {
	requesterID := c.GetUint("user_id")

	var body struct {
		ReceiverID uint `json:"receiver_id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// 自分自身へは不可
	if requesterID == body.ReceiverID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot send request to yourself"})
		return
	}

	// 受信者の実在確認
	var receiver model.User
	if err := db.DB.First(&receiver, body.ReceiverID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Receiver not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error (find receiver)"})
		return
	}

	// すでにフレンドか（accepted 相当は friends で判定）
	isFriend, err := model.AreFriends(requesterID, body.ReceiverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error (check friend)"})
		return
	}
	if isFriend {
		c.JSON(http.StatusConflict, gin.H{"error": "Already friends"})
		return
	}

	// 双方向どちらかに pending があれば新規申請不可
	if ok, err := model.PendingRequestExists(requesterID, body.ReceiverID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error (check pending)"})
		return
	} else if ok {
		c.JSON(http.StatusConflict, gin.H{"error": "Request already sent"})
		return
	}
	if ok, err := model.PendingRequestExists(body.ReceiverID, requesterID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error (check reverse pending)"})
		return
	} else if ok {
		c.JSON(http.StatusConflict, gin.H{"error": "Incoming request already exists"})
		return
	}

	// 過去の accepted を両方向で削除（フレ解除後の再申請でダブり防止）
	if err := db.DB.
		Where(`
			status = 'accepted' AND (
				(requester_id = ? AND receiver_id = ?) OR
				(requester_id = ? AND receiver_id = ?)
			)`,
			requesterID, body.ReceiverID, body.ReceiverID, requesterID,
		).
		Delete(&model.FriendRequest{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cleanup accepted requests failed"})
		return
	}

	// 同一方向(A->B)の直近 declined を pending に“復活”

	// ★ 同一方向(A->B)の直近 declined があれば pending に復活
	var last model.FriendRequest
	err = db.DB.
		Where("requester_id = ? AND receiver_id = ?", requesterID, body.ReceiverID).
		Order("created_at DESC").
		First(&last).Error

	if err == nil && last.Status == "declined" {
		last.Status = "pending"
		if err := db.DB.Save(&last).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revive request"})
			return
		}

		// 復活させた以外の古い declined を同方向で掃除
		_ = db.DB.
			Where(`
				requester_id = ? AND receiver_id = ? AND status = 'declined' AND id <> ?`,
				requesterID, body.ReceiverID, last.ID,
			).
			Delete(&model.FriendRequest{}).Error
		c.JSON(http.StatusOK, last)
		return
	} else if err != nil && err != gorm.ErrRecordNotFound {
		// 想定外のDBエラー
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error (find last request)"})
		return
	}

	// declined が無い（または直近が declined 以外）の場合は新規作成
	request := model.FriendRequest{
		RequesterID: requesterID,
		ReceiverID:  body.ReceiverID,
		Status:      "pending",
	}
	if err := db.DB.Create(&request).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	c.JSON(http.StatusOK, request)
}

// GET /api/friend-requests
// 受信（自分宛て）のリクエストのpendingのみを取得。申請者情報も同梱。
func GetFriendRequestsHandler(c *gin.Context) {
	userID := c.GetUint("user_id")

	var requests []model.FriendRequest
	if err := db.DB.
		Where("receiver_id = ? AND status = ?", userID, "pending").
		Preload("Requester").
		Order("created_at DESC").
		Find(&requests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch requests"})
		return
	}
	c.JSON(http.StatusOK, requests)
}

// PATCH /api/friend-requests/:id
// 承認/拒否（受信者のみ可）。承認時はTxで友達関係を作成。
func RespondToFriendRequestHandler(c *gin.Context) {
	userID := c.GetUint("user_id")
	id, _ := strconv.Atoi(c.Param("id"))

	var req model.FriendRequest
	if err := db.DB.First(&req, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error (find request)"})
		return
	}

	// 認可：受信者のみ操作可能
	if req.ReceiverID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not allowed"})
		return
	}

	var body struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || (body.Status != "accepted" && body.Status != "declined") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	if body.Status == "accepted" {
		// Txで一貫性確保
		if err := db.DB.Transaction(func(tx *gorm.DB) error {
			// ステータス更新
			req.Status = "accepted"
			if err := tx.Save(&req).Error; err != nil {
				return err
			}

			// 既にフレンドかチェック（片方向だけ見れば十分）
			ok, err := model.AreFriends(req.RequesterID, req.ReceiverID)
			if err != nil {
				return err
			}
			if !ok {
				// 双方向作成（ユニーク制約がDBにあれば競合も防げる）
				if err := tx.Create(&model.Friend{UserID: req.RequesterID, FriendID: req.ReceiverID}).Error; err != nil {
					return err
				}
				if err := tx.Create(&model.Friend{UserID: req.ReceiverID, FriendID: req.RequesterID}).Error; err != nil {
					return err
				}
			}

			// // 承認Txの最後
			if err := tx.
				Where(`
					id <> ? AND (
						(requester_id=? AND receiver_id=?) OR
						(requester_id=? AND receiver_id=?)
					)`,
					req.ID, req.RequesterID, req.ReceiverID, req.ReceiverID, req.RequesterID,
				).
				Delete(&model.FriendRequest{}).Error; err != nil {
				return err
			}

			return nil
		}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
		return
	}

	// 拒否
	req.Status = "declined"
	if err := db.DB.Save(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
		return
	}
	c.JSON(http.StatusOK, req)
}

// GET /api/friends
func GetFriendsHandler(c *gin.Context) {
	userID := c.GetUint("user_id")

	log.Printf("🔎 userID in ctx = %d", userID)

	// レスポンス用DTO
	type FriendRow struct {
		ID               uint    `json:"id"`
		UserID           uint    `json:"user_id"`
		FriendID         uint    `json:"friend_id"`
		FriendNickname   string  `json:"friend_nickname"`
		FriendAvatarURL  string  `json:"friend_avatar_url"`
	}

	var out []FriendRow
	if err:= db.DB.Debug().
		Table("friends").
		Select(`
			friends.id,
			friends.user_id,
			friends.friend_id,
			users.nickname  AS friend_nickname,
			users.avatar_url AS friend_avatar_url
		`).
		Joins("JOIN users ON users.id = friends.friend_id").
		Where("friends.user_id = ?", userID).
		Order("users.nickname ASC").
		Scan(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get friends"})
		return
	}

	log.Printf("📦 Friends result count=%d", len(out))
	c.JSON(http.StatusOK, out)
}

// DELETE /api/friends/:id   （:id は相手ユーザーID）
func DeleteFriendHandler(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetUint("user_id")

	res1 := db.DB.Where("user_id = ? AND friend_id = ?", userID, id).Delete(&model.Friend{})
	res2 := db.DB.Where("user_id = ? AND friend_id = ?", id, userID).Delete(&model.Friend{})

	if (res1.Error != nil) || (res2.Error != nil) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete friend"})
		return
	}
	if res1.RowsAffected == 0 && res2.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Friend relation not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friend deleted"})
}

