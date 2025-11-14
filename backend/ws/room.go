package ws

type Room struct {
	id      string
	clients map[*Client]struct{}
}

func NewRoom(id string) *Room {
	return &Room{ id: id, clients: make(map[*Client]struct{}) }
}

func (r *Room) Add(c *Client)    { r.clients[c] = struct{}{} }
func (r *Room) Remove(c *Client) { delete(r.clients, c) }

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
