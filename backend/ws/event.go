package ws

import (
	"encoding/json"
	"log"
	"strings"
	"time"

	"chillow/db"
	"chillow/model"
)

const maxWSMessageLength = 2000

func Dispatch(c *Client, msg []byte) {
	var base struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(msg, &base); err != nil {
		log.Println("❌ invalid WS message:", err)
		return
	}

	switch base.Type {
	case "join":
		handleJoin(c, msg)
	case "message:send":
		handleMessageSend(c, msg)
	case "message:edit":
		handleMessageEdit(c, msg)
	case "message:delete":
		handleMessageDelete(c, msg)
	case "typing:start":
		handleTyping(c, msg, "typing:start")
	case "typing:stop":
		handleTyping(c, msg, "typing:stop")
	case "ping":
		c.sendJSON(map[string]string{"type": "pong"})
	default:
		log.Println("⚠️ unknown event:", base.Type)
	}
}

func handleJoin(c *Client, msg []byte) {
	var e struct {
		Type   string `json:"type"`
		RoomID string `json:"roomId"`
	}
	if err := json.Unmarshal(msg, &e); err != nil {
		return
	}
	if !isUserInRoom(e.RoomID, c.userID) {
		log.Printf("⚠️ unauthorized room access. user=%d room=%s", c.userID, e.RoomID)
		return
	}
	c.joinRoom(e.RoomID)
	log.Printf("👥 user %d joined %s", c.userID, e.RoomID)
}

func handleMessageSend(c *Client, raw []byte) {
	var e SendMessageEvent
	if err := json.Unmarshal(raw, &e); err != nil {
		log.Println("❌ invalid message payload:", err)
		return
	}

	if !isUserInRoom(e.RoomID, c.userID) {
		log.Printf("⚠️ user %d is not part of room %s", c.userID, e.RoomID)
		return
	}

	messageType := strings.ToLower(strings.TrimSpace(e.MessageType))
	if messageType == "" {
		messageType = "text"
	}

	content := strings.TrimSpace(e.Content)
	if len([]rune(content)) > maxWSMessageLength {
		log.Println("⚠️ message too long")
		return
	}
	switch messageType {
	case "text":
		if content == "" {
			log.Println("⚠️ text content is empty")
			return
		}
	case "sticker":
		if content == "" {
			log.Println("⚠️ sticker payload missing")
			return
		}
	case "image":
		if e.AttachmentURL == nil || strings.TrimSpace(*e.AttachmentURL) == "" {
			log.Println("⚠️ image attachment missing")
			return
		}
	default:
		log.Println("⚠️ unsupported message type", messageType)
		return
	}

	var attachment *string
	if e.AttachmentURL != nil {
		trimmed := strings.TrimSpace(*e.AttachmentURL)
		if trimmed != "" {
			attachment = &trimmed
		}
	}
	if messageType == "image" && attachment == nil {
		log.Println("⚠️ missing attachment for image")
		return
	}

	if !isUserInRoom(e.RoomID, c.userID) {
		log.Printf("⚠️ user %d is not part of room %s", c.userID, e.RoomID)
		return
	}

	receiverID, err := counterpartyFromRoom(e.RoomID, c.userID)
	if err != nil {
		log.Printf("⚠️ failed to resolve receiver: %v", err)
		return
	}

	now := time.Now()
	message := model.Message{
		SenderID:      c.userID,
		ReceiverID:    receiverID,
		Content:       content,
		MessageType:   messageType,
		AttachmentURL: attachment,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := db.DB.Create(&message).Error; err != nil {
		log.Printf("❌ failed to persist message: %v", err)
		return
	}
	broadcastMessage(c.hub, e.RoomID, "message:new", message)
}

func handleMessageEdit(c *Client, raw []byte) {
	var e EditMessageEvent
	if err := json.Unmarshal(raw, &e); err != nil {
		log.Println("❌ invalid edit payload:", err)
		return
	}

	if !isUserInRoom(e.RoomID, c.userID) {
		log.Printf("⚠️ user %d cannot edit in room %s", c.userID, e.RoomID)
		return
	}

	var message model.Message
	if err := db.DB.First(&message, e.MessageID).Error; err != nil {
		log.Printf("⚠️ message %d not found: %v", e.MessageID, err)
		return
	}

	if BuildRoomID(message.SenderID, message.ReceiverID) != e.RoomID {
		log.Printf("⚠️ message %d not in room %s", message.ID, e.RoomID)
		return
	}
	if message.SenderID != c.userID {
		log.Printf("⚠️ user %d cannot edit message %d", c.userID, message.ID)
		return
	}
	if message.IsDeleted {
		return
	}

	content := strings.TrimSpace(e.Content)
	if message.MessageType != "image" && content == "" {
		log.Println("⚠️ empty edit content")
		return
	}
	if message.MessageType != "image" && len([]rune(content)) > maxWSMessageLength {
		log.Println("⚠️ edit content too long")
		return
	}

	message.Content = content
	now := time.Now()
	message.EditedAt = &now
	message.UpdatedAt = now
	if err := db.DB.Save(&message).Error; err != nil {
		log.Printf("⚠️ failed to update message: %v", err)
		return
	}

	broadcastMessage(c.hub, e.RoomID, "message:updated", message)
}

func handleMessageDelete(c *Client, raw []byte) {
	var e DeleteMessageEvent
	if err := json.Unmarshal(raw, &e); err != nil {
		log.Println("❌ invalid delete payload:", err)
		return
	}

	if !isUserInRoom(e.RoomID, c.userID) {
		return
	}

	var message model.Message
	if err := db.DB.First(&message, e.MessageID).Error; err != nil {
		log.Printf("⚠️ message %d not found: %v", e.MessageID, err)
		return
	}

	if BuildRoomID(message.SenderID, message.ReceiverID) != e.RoomID {
		return
	}
	if message.SenderID != c.userID {
		return
	}
	if message.IsDeleted {
		return
	}

	now := time.Now()
	message.IsDeleted = true
	message.DeletedAt = &now
	message.UpdatedAt = now
	message.Content = ""
	message.AttachmentURL = nil
	if err := db.DB.Save(&message).Error; err != nil {
		log.Printf("⚠️ failed to delete message: %v", err)
		return
	}

	broadcastMessage(c.hub, e.RoomID, "message:deleted", message)
}

func handleTyping(c *Client, raw []byte, eventType string) {
	var e TypingEvent
	if err := json.Unmarshal(raw, &e); err != nil {
		return
	}
	if !isUserInRoom(e.RoomID, c.userID) {
		return
	}

	payload := TypingBroadcast{Type: eventType, RoomID: e.RoomID, UserID: c.userID}
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}
	c.hub.Broadcast(e.RoomID, data)
}

func broadcastMessage(h *Hub, roomID, eventType string, message model.Message) {
	dto := BuildMessageDTO(roomID, message)
	event := MessageEvent{Type: eventType, RoomID: roomID, Message: dto}
	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("⚠️ failed to marshal %s: %v", eventType, err)
		return
	}
	h.Broadcast(roomID, data)
}
