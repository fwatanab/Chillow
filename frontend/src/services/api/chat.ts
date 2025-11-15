import axios from "../../utils/axios";
import type { MessagePayload } from "../../types/chat";

export const fetchMessages = async (friendId: number): Promise<MessagePayload[]> => {
	const res = await axios.get(`/messages/${friendId}`);
	return res.data ?? [];
};

export const markMessageAsRead = async (messageId: number): Promise<void> => {
	await axios.post(`/messages/${messageId}/read`);
};

export const uploadMessageAttachment = async (file: File): Promise<{ url: string; objectKey?: string }> => {
	const formData = new FormData();
	formData.append("file", file);
	const res = await axios.post("/messages/media", formData, {
		headers: { "Content-Type": "multipart/form-data" },
	});
	return res.data;
};
