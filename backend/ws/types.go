package ws

// MessageDTO ... チャットメッセージの内容
type MessageDTO struct {
	ID         uint   `json:"id"`
	RoomID     string `json:"room_id"`
	SenderID   uint   `json:"sender_id"`
	ReceiverID uint   `json:"receiver_id"`
	Content    string `json:"content"`
	CreatedAt  string `json:"created_at"` // ISO8601文字列で返す予定
}

// WsReceiveEvent ... サーバー→クライアントへ送るイベント
type WsReceiveEvent struct {
	Type    string     `json:"type"` // e.g. "message:new"
	RoomID  string     `json:"roomId"`
	Message MessageDTO `json:"message"` // 受信メッセージの本体
}

type RecvBase struct {
	Type string `json:"type"`
}

type JoinEvent struct {
	Type   string `json:"type"` // "join"
	RoomID string `json:"roomId"`
}

type SendMessageEvent struct {
	Type    string `json:"type"` // "message:send"
	RoomID  string `json:"roomId"`
	Content string `json:"content"`
}

type PongEvent struct {
	Type string `json:"type"` // "pong"
}

type NewMessageEvent struct { // サーバ→クライアント
	Type    string     `json:"type"` // "message:new"
	RoomID  string     `json:"roomId"`
	Message MessageDTO `json:"message"`
}
