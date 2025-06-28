package ws

import (
	"chillow/model"
	"chillow/db"
	"encoding/json"
	"log"
	"time"
	"github.com/gorilla/websocket"
)

type MessagePayload struct {
	SenderID   uint   `json:"sender_id"`
	ReceiverID uint   `json:"receiver_id"`
	Content    string `json:"content"`
	Timestamp  string `json:"timestamp"`
}

func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			log.Println("read error:", err)
			break
		}
		var payload MessagePayload
		if err := json.Unmarshal(message, &payload); err != nil {
			log.Println("unmarshal error:", err)
			continue
		}
		payload.SenderID = c.userID
		payload.Timestamp = time.Now().UTC().Format(time.RFC3339)

		// DB保存
		saved := model.Message{
			SenderID:   payload.SenderID,
			ReceiverID: payload.ReceiverID,
			Content:    payload.Content,
			CreatedAt:  time.Now().UTC(),
			Read:       false,
		}
		if err := db.DB.Create(&saved).Error; err != nil {
			log.Println("failed to save message to DB:", err)
			continue
		}

		c.hub.broadcast <- payload
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			msg, _ := json.Marshal(message)
			c.conn.WriteMessage(websocket.TextMessage, msg)

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

