package ws

import "encoding/json"

type Hub struct {
	rooms map[string]*Room

	// ルーム操作用のチャネル（Runでselect）
	join      chan joinReq
	leave     chan leaveReq
	broadcast chan broadcastReq
}

type joinReq struct {
	roomID string
	client *Client
}
type leaveReq struct {
	roomID string
	client *Client
}
type broadcastReq struct {
	roomID string
	bytes  []byte
}

func NewHub() *Hub {
	return &Hub{
		rooms:     make(map[string]*Room),
		join:      make(chan joinReq),
		leave:     make(chan leaveReq),
		broadcast: make(chan broadcastReq),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case j := <-h.join:
			r := h.getOrCreateRoom(j.roomID)
			if r.Add(j.client) {
				h.emitPresence(r)
			}
		case l := <-h.leave:
			if r, ok := h.rooms[l.roomID]; ok {
				if r.Remove(l.client) {
					h.emitPresence(r)
				}
				if r.IsEmpty() {
					delete(h.rooms, l.roomID)
				}
			}
		case b := <-h.broadcast:
			if r, ok := h.rooms[b.roomID]; ok {
				r.Broadcast(b.bytes)
			}
		}
	}
}

func (h *Hub) getOrCreateRoom(id string) *Room {
	if r, ok := h.rooms[id]; ok {
		return r
	}
	r := NewRoom(id)
	h.rooms[id] = r
	return r
}

// 外部から呼ぶAPI
func (h *Hub) Join(roomID string, c *Client)  { h.join <- joinReq{roomID: roomID, client: c} }
func (h *Hub) Leave(roomID string, c *Client) { h.leave <- leaveReq{roomID: roomID, client: c} }
func (h *Hub) Broadcast(roomID string, b []byte) {
	h.broadcast <- broadcastReq{roomID: roomID, bytes: b}
}

func (h *Hub) emitPresence(r *Room) {
	if r == nil {
		return
	}
	event := PresenceEvent{Type: "presence:update", RoomID: r.id, Users: r.UserIDs()}
	data, err := json.Marshal(event)
	if err != nil {
		return
	}
	r.Broadcast(data)
}
