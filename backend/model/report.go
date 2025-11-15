package model

import "time"

type Report struct {
	ID             uint       `gorm:"primaryKey" json:"id"`
	ReporterID     uint       `json:"reporter_id"`
	ReportedUserID uint       `json:"reported_user_id"`
	MessageID      uint       `json:"message_id"`
	MessageContent string     `json:"message_content"`
	MessageType    string     `json:"message_type"`
	AttachmentURL  *string    `json:"attachment_url"`
	Reason         string     `json:"reason"`
	Status         string     `gorm:"type:varchar(20);default:'pending'" json:"status"`
	Resolution     *string    `json:"resolution"`
	ResolutionNote *string    `json:"resolution_note"`
	HandledBy      *uint      `json:"handled_by"`
	HandledAt      *time.Time `json:"handled_at"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	Reporter       User       `gorm:"foreignKey:ReporterID" json:"reporter"`
	ReportedUser   User       `gorm:"foreignKey:ReportedUserID" json:"reported_user"`
	HandledByUser  *User      `gorm:"foreignKey:HandledBy" json:"handled_by_user,omitempty"`
}
