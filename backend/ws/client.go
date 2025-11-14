package ws

import (
	"encoding/json"
	"time"

	"github.com/gorilla/websocket"
)

type Client struct {
	userID      uint
	conn        *websocket.Conn
	hub         *Hub
	send        chan []byte
	joinedRooms map[string]struct{}
}

func NewClient(userID uint, conn *websocket.Conn, hub *Hub) *Client {
	return &Client{
		userID:      userID,
		conn:        conn,
		hub:         hub,
		send:        make(chan []byte, 256),
		joinedRooms: make(map[string]struct{}),
	}
}

func (c *Client) Start() {
	go c.writeLoop()
	go c.readLoop()
}

func (c *Client) readLoop() {
	defer c.Close()
	for {
		_, msg, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		Dispatch(c, msg)
	}
}

func (c *Client) writeLoop() {
	defer c.Close()
	for {
		select {
		case msg, ok := <-c.send:
			if !ok { return }
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		}
	}
}

func (c *Client) Close() {
	// ルーム離脱
	for roomID := range c.joinedRooms {
		c.hub.Leave(roomID, c)
	}
	// チャネルクローズ & コネクションクローズ
	select { case <-c.send: default: }
	close(c.send)
	_ = c.conn.Close()
}

func (c *Client) joinRoom(roomID string) {
	c.joinedRooms[roomID] = struct{}{}
	c.hub.Join(roomID, c)
}

func (c *Client) sendJSON(v any) error {
	b, err := json.Marshal(v)
	if err != nil { return err }
	select {
	case c.send <- b:
	default:
		go c.Close()
	}
	return nil
}
