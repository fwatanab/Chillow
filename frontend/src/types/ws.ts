export type MessageDTO = {
	id: number;
	room_id: string;
	sender_id: number;
	receiver_id: number;
	content: string;
	message_type: "text" | "image" | "sticker" | string;
	attachment_url?: string | null;
	is_deleted: boolean;
	is_read: boolean;
	created_at: string;
	edited_at?: string | null;
};

export type WsSendEvent =
	| { type: "join"; roomId: string }
	| { type: "message:send"; roomId: string; content: string; messageType: MessageDTO["message_type"]; attachmentUrl?: string | null }
	| { type: "message:edit"; roomId: string; messageId: number; content: string }
	| { type: "message:delete"; roomId: string; messageId: number }
	| { type: "typing:start"; roomId: string }
	| { type: "typing:stop"; roomId: string }
	| { type: "ping" };

export type WsReceiveEvent =
	| { type: "message:new"; roomId: string; message: MessageDTO }
	| { type: "message:updated"; roomId: string; message: MessageDTO }
	| { type: "message:deleted"; roomId: string; message: MessageDTO }
	| { type: "message:read"; roomId: string; message: MessageDTO }
	| { type: "typing:start"; roomId: string; userId: number }
	| { type: "typing:stop"; roomId: string; userId: number }
	| { type: "presence:update"; roomId: string; users: number[] }
	| { type: "pong" };
