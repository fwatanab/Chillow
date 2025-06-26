import axios from "axios";
import type { MessagePayload } from "../types/chat";

// メッセージ履歴取得
export const getMessages = async (
  friendId: number,
  limit: number = 30,
  before?: string
): Promise<MessagePayload[]> => {
  const token = localStorage.getItem("access_token");
  const params: Record<string, any> = { limit };
  if (before) params.before = before;

  const response = await axios.get(`/api/messages/${friendId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params,
  });
  return response.data;
};

// // メッセージ送信
// export const sendMessage = async (friendId: number, content: string): Promise<Message> => {
// 	const res = await axios.post(`/api/messages/${friendId}`, { content });
// 	return res.data;
// };
// 
// // 読み取り済みにする
// export const markAsRead = async (friendId: number) => {
// 	await axios.post(`/api/messages/${friendId}/read`);
// };
