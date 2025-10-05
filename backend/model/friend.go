package model

import (
	"chillow/db"
	"gorm.io/gorm"
	"time"
)

type FriendRequest struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	RequesterID uint      `json:"requester_id"`
	ReceiverID  uint      `json:"receiver_id"`
	Status      string    `json:"status"` // "pending", "accepted", "declined"
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// 外部キー：users.id に対応（必要なら制約も付与可能）
	Requester User `gorm:"foreignKey:RequesterID" json:"requester"`
}

type Friend struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"uniqueIndex:ux_user_friend" json:"user_id"`
	FriendID  uint      `gorm:"uniqueIndex:ux_user_friend" json:"friend_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// 片方向の pending 存在チェック（A->Bのみ）
func PendingRequestExists(requesterID, receiverID uint) (bool, error) {
	var req FriendRequest
	err := db.DB.Where("requester_id = ? AND receiver_id = ? AND status = ?", requesterID, receiverID, "pending").
		First(&req).Error
	if err == gorm.ErrRecordNotFound {
		return false, nil
	}
	return err == nil, err
}

// 片方向の友達関係があるか（A->Bのみ）
func AreFriends(userID1, userID2 uint) (bool, error) {
	var f Friend
	err := db.DB.
		Where("user_id = ? AND friend_id = ?", userID1, userID2).
		First(&f).Error
	if err == gorm.ErrRecordNotFound {
		return false, nil
	}
	return err == nil, err
}

