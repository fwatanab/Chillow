export type MessagePayload = {
	id: number;
	sender_id: number;
	receiver_id: number;
	content: string;
	message_type: "text" | "image" | "sticker" | string;
	attachment_url?: string | null;
	attachment_object?: string | null;
	created_at: string;
	edited_at?: string | null;
	is_deleted?: boolean;
	is_read?: boolean;
	isOwn?: boolean;
};
