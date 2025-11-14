package model

import "time"

type Message struct {
	ID            uint       `gorm:"primaryKey" json:"id"`
	SenderID      uint       `json:"sender_id"`
	ReceiverID    uint       `json:"receiver_id"`
	Content       string     `json:"content"`
	MessageType   string     `gorm:"type:varchar(20);default:'text'" json:"message_type"`
	AttachmentURL *string    `json:"attachment_url"`
	IsRead        bool       `json:"is_read"`
	IsDeleted     bool       `json:"is_deleted"`
	EditedAt      *time.Time `json:"edited_at"`
	DeletedAt     *time.Time `json:"deleted_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}
