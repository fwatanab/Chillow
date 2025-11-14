export type MessageDTO = {
	id: number;
	room_id: string;
	sender_id: number;
	receiver_id: number;
	content: string;
	created_at: string;
};

export type WsSendEvent =
	| { type: "join"; roomId: string }
	| { type: "message:send"; roomId: string; content: string }
	| { type: "typing:start"; roomId: string }
	| { type: "typing:stop"; roomId: string }
	| { type: "ping" };

export type WsReceiveEvent =
	| { type: "message:new"; roomId: string; message: MessageDTO }
	| { type: "typing:start"; roomId: string; userId: number }
	| { type: "typing:stop"; roomId: string; userId: number }
	| { type: "pong" };
