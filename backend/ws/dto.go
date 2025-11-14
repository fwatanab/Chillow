package ws

import (
	"time"

	"chillow/model"
)

// BuildMessageDTO converts a DB message model into a WebSocket DTO.
func BuildMessageDTO(roomID string, message model.Message) MessageDTO {
	var attachment *string
	if message.AttachmentURL != nil {
		copy := *message.AttachmentURL
		attachment = &copy
	}

	var editedAt *string
	if message.EditedAt != nil {
		formatted := message.EditedAt.Format(time.RFC3339)
		editedAt = &formatted
	}

	return MessageDTO{
		ID:            message.ID,
		RoomID:        roomID,
		SenderID:      message.SenderID,
		ReceiverID:    message.ReceiverID,
		Content:       message.Content,
		MessageType:   message.MessageType,
		AttachmentURL: attachment,
		IsDeleted:     message.IsDeleted,
		IsRead:        message.IsRead,
		CreatedAt:     message.CreatedAt.Format(time.RFC3339),
		EditedAt:      editedAt,
	}
}
