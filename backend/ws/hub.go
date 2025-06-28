package ws

import (
	"log"
	"time"
	"github.com/gorilla/websocket"
)

type Hub struct {
	clients    map[uint]*Client     // ユーザーIDをキーとしたクライアント一覧
	broadcast  chan MessagePayload  // すべてのクライアントにブロードキャストするメッセージ
	register   chan *Client         // 接続登録用
	unregister chan *Client         // 切断通知用
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[uint]*Client),
		broadcast:  make(chan MessagePayload),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client.userID] = client
			log.Printf("User %d connected\n", client.userID)

		case client := <-h.unregister:
			if _, ok := h.clients[client.userID]; ok {
				delete(h.clients, client.userID)
				close(client.send)
				log.Printf("User %d disconnected\n", client.userID)
			}

		case message := <-h.broadcast:
			if receiver, ok := h.clients[message.ReceiverID]; ok {
				receiver.send <- message
			} else {
				log.Printf("User %d not connected\n", message.ReceiverID)
			}
		}
	}
}

