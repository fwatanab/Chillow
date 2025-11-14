import { useEffect, useMemo } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { chatMessagesState, currentChatFriendState } from "../recoil/chatState";
import { currentUserState } from "../store/auth";
import { fetchMessages } from "../services/api/chat";
import { useWebSocket } from "./useWebSocket";
import { buildRoomId } from "../utils/chat";

export function useChatSocket(friendUserId: number) {
	const currentUser = useRecoilValue(currentUserState);
	const [messages, setMessages] = useRecoilState(chatMessagesState(friendUserId));
	const setCurrentFriend = useSetRecoilState(currentChatFriendState);
	const { send, join, onType, connect } = useWebSocket();

	const roomId = useMemo(() => {
		if (!currentUser) return "";
		return buildRoomId(currentUser.id, friendUserId);
	}, [currentUser, friendUserId]);

	// 履歴を取得
	useEffect(() => {
		if (!currentUser) return;

		fetchMessages(friendUserId)
			.then((data) => {
				const normalized = (data ?? []).map((msg) => ({
					id: msg.id,
					sender_id: msg.sender_id,
					receiver_id: msg.receiver_id,
					content: msg.content,
					created_at: msg.created_at,
					isOwn: msg.sender_id === currentUser.id,
				}));
				setMessages(normalized);
			})
			.catch((err) => console.error("❌ メッセージ取得に失敗", err));
	}, [friendUserId, currentUser, setMessages]);

	// WebSocket購読
	useEffect(() => {
		if (!currentUser || !roomId) return;

		connect();
		join(roomId);
		setCurrentFriend(friendUserId);

		const unsubscribe = onType("message:new", (event) => {
			if (event.roomId !== roomId) return;

			setMessages((prev) => [
				...prev,
				{
					id: event.message.id,
					sender_id: event.message.sender_id,
					receiver_id: event.message.receiver_id,
					content: event.message.content,
					created_at: event.message.created_at,
					isOwn: event.message.sender_id === currentUser.id,
				},
			]);
		});

		return () => {
			unsubscribe();
			setCurrentFriend((prev) => (prev === friendUserId ? null : prev));
		};
	}, [currentUser, friendUserId, join, onType, roomId, setCurrentFriend, setMessages, connect]);

	const sendMessage = (content: string) => {
		if (!content.trim() || !roomId) return;
		send({ type: "message:send", roomId, content: content.trim() });
	};

	return { sendMessage, messages };
}
