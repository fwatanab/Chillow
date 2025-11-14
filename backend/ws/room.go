package ws

import "sort"

type Room struct {
	id      string
	clients map[*Client]struct{}
}

func NewRoom(id string) *Room {
	return &Room{id: id, clients: make(map[*Client]struct{})}
}

func (r *Room) Add(c *Client) bool {
	if _, exists := r.clients[c]; exists {
		return false
	}
	r.clients[c] = struct{}{}
	return true
}

func (r *Room) Remove(c *Client) bool {
	if _, exists := r.clients[c]; !exists {
		return false
	}
	delete(r.clients, c)
	return true
}

func (r *Room) Broadcast(b []byte) {
	for c := range r.clients {
		select {
		case c.send <- b:
		default:
			// バックプレッシャー：詰まってたら切断
			go c.Close()
		}
	}
}

func (r *Room) UserIDs() []uint {
	seen := make(map[uint]struct{})
	for client := range r.clients {
		seen[client.userID] = struct{}{}
	}
	ids := make([]uint, 0, len(seen))
	for id := range seen {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })
	return ids
}

func (r *Room) IsEmpty() bool {
	return len(r.clients) == 0
}
