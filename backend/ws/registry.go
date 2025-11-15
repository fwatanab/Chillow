package ws

import (
	"sync"
)

type clientRegistry struct {
	mu      sync.RWMutex
	clients map[uint]map[*Client]struct{}
}

var registry = &clientRegistry{clients: make(map[uint]map[*Client]struct{})}

func registerClient(c *Client) {
	registry.mu.Lock()
	defer registry.mu.Unlock()
	set := registry.clients[c.userID]
	if set == nil {
		set = make(map[*Client]struct{})
		registry.clients[c.userID] = set
	}
	set[c] = struct{}{}
}

func unregisterClient(c *Client) {
	registry.mu.Lock()
	defer registry.mu.Unlock()
	if set, ok := registry.clients[c.userID]; ok {
		delete(set, c)
		if len(set) == 0 {
			delete(registry.clients, c.userID)
		}
	}
}

func DisconnectUser(userID uint, reason string) {
	registry.mu.RLock()
	set := registry.clients[userID]
	if len(set) == 0 {
		registry.mu.RUnlock()
		return
	}
	targets := make([]*Client, 0, len(set))
	for c := range set {
		targets = append(targets, c)
	}
	registry.mu.RUnlock()

	payload := map[string]string{"type": "account:suspended"}
	if reason != "" {
		payload["reason"] = reason
	}
	for _, client := range targets {
		_ = client.sendJSON(payload)
		go client.Close()
	}
}
