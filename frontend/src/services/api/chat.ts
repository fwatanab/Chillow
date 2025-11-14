import axios from "../../utils/axios";
import type { MessagePayload } from "../../types/chat";

export const fetchMessages = async (friendId: number): Promise<MessagePayload[]> => {
	const res = await axios.get(`/messages/${friendId}`);
	return res.data ?? [];
};
