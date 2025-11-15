package adminstream

import (
	"sync"

	"chillow/model"
)

type Event struct {
	Type   string        `json:"type"`
	Report *model.Report `json:"report,omitempty"`
	User   *model.User   `json:"user,omitempty"`
}

type hub struct {
	mu   sync.RWMutex
	subs map[chan Event]struct{}
}

var defaultHub = &hub{subs: make(map[chan Event]struct{})}

func Subscribe() (chan Event, func()) {
	ch := make(chan Event, 10)
	defaultHub.mu.Lock()
	defaultHub.subs[ch] = struct{}{}
	defaultHub.mu.Unlock()
	cancel := func() {
		defaultHub.mu.Lock()
		delete(defaultHub.subs, ch)
		defaultHub.mu.Unlock()
		close(ch)
	}
	return ch, cancel
}

func Broadcast(evt Event) {
	defaultHub.mu.RLock()
	defer defaultHub.mu.RUnlock()
	for ch := range defaultHub.subs {
		select {
		case ch <- evt:
		default:
		}
	}
}
