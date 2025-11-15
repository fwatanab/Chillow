package ws

import (
	"encoding/json"
	"log"
	"strings"
	"time"

	"chillow/db"
	"chillow/model"
	"chillow/storage"

	"gorm.io/gorm/clause"
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
	if _, ok := ensureRoomAccess(c, e.RoomID); !ok {
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
	var attachmentObj *string
	if e.AttachmentObj != nil {
		trimmed := strings.TrimSpace(*e.AttachmentObj)
		if trimmed != "" {
			attachmentObj = &trimmed
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

	receiverID, ok := ensureRoomAccess(c, e.RoomID)
	if !ok {
		return
	}

	now := time.Now()
	message := model.Message{
		SenderID:      c.userID,
		ReceiverID:    receiverID,
		Content:       content,
		MessageType:   messageType,
		AttachmentURL: attachment,
		AttachmentObj: attachmentObj,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := db.DB.Create(&message).Error; err != nil {
		log.Printf("❌ failed to persist message: %v", err)
		return
	}
	createReadReceipt(c.userID, message.ID)
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
	if _, ok := ensureRoomAccess(c, e.RoomID); !ok {
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
	if _, ok := ensureRoomAccess(c, e.RoomID); !ok {
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
	if message.AttachmentObj != nil {
		_ = storage.Default().Delete(*message.AttachmentObj)
	}
	message.AttachmentURL = nil
	message.AttachmentObj = nil
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
	if _, ok := ensureRoomAccess(c, e.RoomID); !ok {
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

func ensureRoomAccess(c *Client, roomID string) (uint, bool) {
	peerID, err := counterpartyFromRoom(roomID, c.userID)
	if err != nil {
		log.Printf("⚠️ failed to parse room %s: %v", roomID, err)
		return 0, false
	}
	ok, err := model.AreFriends(c.userID, peerID)
	if err != nil {
		log.Printf("⚠️ friendship check failed: %v", err)
		return peerID, false
	}
	if !ok {
		notifyRoomRevoked(c, roomID)
		return peerID, false
	}
	return peerID, true
}

func notifyRoomRevoked(c *Client, roomID string) {
	_ = c.sendJSON(RoomRevokedEvent{Type: "room:revoked", RoomID: roomID})
	c.leaveRoom(roomID)
}

func createReadReceipt(userID, messageID uint) {
	if userID == 0 || messageID == 0 {
		return
	}
	now := time.Now()
	entry := model.MessageRead{MessageID: messageID, UserID: userID, ReadAt: now}
	if err := db.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "message_id"}, {Name: "user_id"}},
		DoUpdates: clause.Assignments(map[string]interface{}{"read_at": now}),
	}).Create(&entry).Error; err != nil {
		log.Printf("⚠️ failed to upsert read receipt: %v", err)
	}
}
