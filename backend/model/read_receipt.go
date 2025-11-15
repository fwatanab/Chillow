package model

import "time"

type MessageRead struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	MessageID uint      `gorm:"uniqueIndex:ux_message_user" json:"message_id"`
	UserID    uint      `gorm:"uniqueIndex:ux_message_user" json:"user_id"`
	ReadAt    time.Time `json:"read_at"`
}
