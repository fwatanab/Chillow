package ws

import (
	"encoding/json"
	"log"
	"strings"
	"time"

	"chillow/db"
	"chillow/model"
)

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
	c.hub.Join(e.RoomID, c)
	log.Printf("👥 user %d joined %s", c.userID, e.RoomID)
}

func handleMessageSend(c *Client, raw []byte) {
	var e SendMessageEvent
	if err := json.Unmarshal(raw, &e); err != nil {
		log.Println("❌ invalid message payload:", err)
		return
	}

	content := strings.TrimSpace(e.Content)
	if content == "" {
		log.Println("⚠️ message content is empty")
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

	message := model.Message{
		SenderID:   c.userID,
		ReceiverID: receiverID,
		Content:    content,
		CreatedAt:  time.Now(),
	}

	if err := db.DB.Create(&message).Error; err != nil {
		log.Printf("❌ failed to persist message: %v", err)
		return
	}

	dto := MessageDTO{
		ID:         message.ID,
		RoomID:     e.RoomID,
		SenderID:   message.SenderID,
		ReceiverID: message.ReceiverID,
		Content:    message.Content,
		CreatedAt:  message.CreatedAt.Format(time.RFC3339),
	}

	ev := WsReceiveEvent{
		Type:    "message:new",
		RoomID:  e.RoomID,
		Message: dto,
	}

	data, err := json.Marshal(ev)
	if err != nil {
		log.Printf("⚠️ failed to marshal event: %v", err)
		return
	}

	c.hub.Broadcast(e.RoomID, data)
}
