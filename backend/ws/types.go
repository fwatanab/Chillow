package ws

// MessageDTO ... チャットメッセージの内容
type MessageDTO struct {
	ID            uint    `json:"id"`
	RoomID        string  `json:"room_id"`
	SenderID      uint    `json:"sender_id"`
	ReceiverID    uint    `json:"receiver_id"`
	Content       string  `json:"content"`
	MessageType   string  `json:"message_type"`
	AttachmentURL *string `json:"attachment_url"`
	AttachmentObj *string `json:"attachment_object"`
	IsDeleted     bool    `json:"is_deleted"`
	IsRead        bool    `json:"is_read"`
	CreatedAt     string  `json:"created_at"`
	EditedAt      *string `json:"edited_at"`
}

type MessageEvent struct {
	Type    string     `json:"type"`
	RoomID  string     `json:"roomId"`
	Message MessageDTO `json:"message"`
}

type PresenceEvent struct {
	Type   string `json:"type"`
	RoomID string `json:"roomId"`
	Users  []uint `json:"users"`
}

type TypingBroadcast struct {
	Type   string `json:"type"`
	RoomID string `json:"roomId"`
	UserID uint   `json:"userId"`
}

type JoinEvent struct {
	Type   string `json:"type"`
	RoomID string `json:"roomId"`
}

type SendMessageEvent struct {
	Type          string  `json:"type"`
	RoomID        string  `json:"roomId"`
	Content       string  `json:"content"`
	MessageType   string  `json:"messageType"`
	AttachmentURL *string `json:"attachmentUrl"`
	AttachmentObj *string `json:"attachmentObject"`
}

type EditMessageEvent struct {
	Type      string `json:"type"`
	RoomID    string `json:"roomId"`
	MessageID uint   `json:"messageId"`
	Content   string `json:"content"`
}

type DeleteMessageEvent struct {
	Type      string `json:"type"`
	RoomID    string `json:"roomId"`
	MessageID uint   `json:"messageId"`
}

type TypingEvent struct {
	Type   string `json:"type"`
	RoomID string `json:"roomId"`
}

type PongEvent struct {
	Type string `json:"type"`
}

type RoomRevokedEvent struct {
	Type   string `json:"type"`
	RoomID string `json:"roomId"`
}
