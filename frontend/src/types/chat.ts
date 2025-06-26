export interface MessagePayload {
	type: string;
	sender_id: number;
	receiver_id: number;
	content: string;
	timestamp?: string;
}
