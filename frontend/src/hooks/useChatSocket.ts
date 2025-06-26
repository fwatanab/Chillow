import { useEffect, useRef } from "react";
import { useRecoilState, useSetRecoilState } from "recoil";
import { chatMessagesState, currentChatFriendState } from "../recoil/chatState";
import { getAccessToken } from "../utils/auth";
import type { MessagePayload } from "../types/chat";

const WS_BASE_URL = "ws://localhost:8080/ws/chat";

export function useChatSocket(friendId: number) {
	const [messages, setMessages] = useRecoilState(chatMessagesState(friendId));
	const setCurrentFriend = useSetRecoilState(currentChatFriendState);
	const ws = useRef<WebSocket | null>(null);

	useEffect(() => {
		const token = getAccessToken();
		if (!token) return;

		const socket = new WebSocket(`${WS_BASE_URL}?token=${token}`);
		ws.current = socket;

		socket.onopen = () => {
			console.log("WebSocket connected");
			setCurrentFriend(friendId);
		};

		socket.onmessage = (event) => {
			try {
				const msg: MessagePayload = JSON.parse(event.data);
				if (msg.type === "message" && msg.sender_id === friendId) {
					setMessages((prev) => [...prev, msg]);
				}
			} catch (err) {
				console.error("Invalid message: ", err);
			}
		};

		socket.onclose = () => {
			console.log("WebSocket closed");
		};

		return () => {
			socket.close();
		};
	}, [friendId, setMessages, setCurrentFriend]);

	const sendMessage = (content: string) => {
		if (ws.current && ws.current.readyState === WebSocket.OPEN) {
			const payload = {
				type: "message",
				receiver_id: friendId,
				content,
			};
			ws.current.send(JSON.stringify(payload));
		}
	};

	return { sendMessage, messages };
}

