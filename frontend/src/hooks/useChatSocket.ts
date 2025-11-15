import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { chatMessagesState, currentChatFriendState } from "../recoil/chatState";
import { currentUserState } from "../store/auth";
import { fetchMessages, markMessageAsRead } from "../services/api/chat";
import { useWebSocket } from "./useWebSocket";
import { buildRoomId } from "../utils/chat";
import type { MessagePayload } from "../types/chat";
import type { MessageDTO } from "../types/ws";

type SendMessageOptions = {
	messageType?: MessagePayload["message_type"];
	attachmentUrl?: string | null;
	attachmentObject?: string | null;
};

export function useChatSocket(friendUserId: number) {
	const currentUser = useRecoilValue(currentUserState);
	const [messages, setMessages] = useRecoilState(chatMessagesState(friendUserId));
	const setCurrentFriend = useSetRecoilState(currentChatFriendState);
	const { send, join, onType } = useWebSocket();
	const [isFriendTyping, setFriendTyping] = useState(false);
	const [isFriendOnline, setFriendOnline] = useState(false);
	const typingTimeoutRef = useRef<number | null>(null);

	const roomId = useMemo(() => {
		if (!currentUser) return "";
		return buildRoomId(currentUser.id, friendUserId);
	}, [currentUser, friendUserId]);

	const toPayload = useCallback(
		(msg: MessagePayload | MessageDTO): MessagePayload => {
			const base = msg as Partial<MessagePayload & MessageDTO>;
			return {
				id: base.id!,
				sender_id: base.sender_id!,
				receiver_id: base.receiver_id!,
				content: base.content ?? "",
				message_type: base.message_type ?? "text",
				attachment_url: base.attachment_url ?? null,
				attachment_object: base.attachment_object ?? null,
				created_at: base.created_at!,
				edited_at: base.edited_at ?? null,
				is_deleted: base.is_deleted ?? false,
				is_read: base.is_read ?? false,
				isOwn: (base.sender_id ?? 0) === (currentUser?.id ?? 0),
			};
		},
		[currentUser?.id]
	);

	// 履歴を取得
	useEffect(() => {
		if (!currentUser) return;

		fetchMessages(friendUserId)
			.then((data) => {
				const normalized = (data ?? []).map((msg) => toPayload(msg));
				setMessages(normalized);
			})
			.catch((err) => console.error("❌ メッセージ取得に失敗", err));
	}, [friendUserId, currentUser, setMessages, toPayload]);

	// WebSocket購読
	useEffect(() => {
		if (!currentUser || !roomId) return;

		join(roomId);
		setCurrentFriend(friendUserId);

		const clearTypingTimeout = () => {
			if (typingTimeoutRef.current) {
				window.clearTimeout(typingTimeoutRef.current);
				typingTimeoutRef.current = null;
			}
		};

		const handleTyping = (active: boolean) => {
			setFriendTyping(active);
			if (active) {
				clearTypingTimeout();
				typingTimeoutRef.current = window.setTimeout(() => {
					setFriendTyping(false);
					typingTimeoutRef.current = null;
				}, 4000);
			} else {
				clearTypingTimeout();
			}
		};

		const offNew = onType("message:new", (event) => {
			if (event.roomId !== roomId) return;
			const payload = toPayload(event.message);
			if (!payload.isOwn) {
				payload.is_read = true;
			}
			setMessages((prev) => [...prev, payload]);
			if (!payload.isOwn) {
				markMessageAsRead(payload.id).catch((err) => console.error("❌ 既読反映に失敗", err));
			}
		});

		const offUpdated = onType("message:updated", (event) => {
			if (event.roomId !== roomId) return;
			const payload = toPayload(event.message);
			setMessages((prev) =>
				prev.map((msg) => (msg.id === payload.id ? { ...msg, ...payload } : msg))
			);
		});

		const offDeleted = onType("message:deleted", (event) => {
			if (event.roomId !== roomId) return;
			const payload = toPayload(event.message);
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === payload.id
						? {
							...msg,
							is_deleted: true,
							content: "",
							attachment_url: null,
						}
						: msg
				)
			);
		});

		const offRead = onType("message:read", (event) => {
			if (event.roomId !== roomId) return;
			const payload = toPayload(event.message);
			setMessages((prev) =>
				prev.map((msg) => (msg.id === payload.id ? { ...msg, is_read: true } : msg))
			);
		});

		const offTypingStart = onType("typing:start", (event) => {
			if (event.roomId !== roomId || event.userId === currentUser.id) return;
			handleTyping(true);
		});

		const offTypingStop = onType("typing:stop", (event) => {
			if (event.roomId !== roomId || event.userId === currentUser.id) return;
			handleTyping(false);
		});

		const offPresence = onType("presence:update", (event) => {
			if (event.roomId !== roomId) return;
			setFriendOnline(event.users.includes(friendUserId));
		});

		const offRoomRevoked = onType("room:revoked", (event) => {
			if (event.roomId !== roomId) return;
			setMessages([]);
			alert("このフレンドとのチャットは利用できません。フレンド状態を確認してください。");
		});

		return () => {
			offNew();
			offUpdated();
			offDeleted();
				offTypingStart();
				offTypingStop();
				offPresence();
				offRead();
				offRoomRevoked();
			setCurrentFriend((prev) => (prev === friendUserId ? null : prev));
			setFriendTyping(false);
			setFriendOnline(false);
			if (typingTimeoutRef.current) {
				window.clearTimeout(typingTimeoutRef.current);
				typingTimeoutRef.current = null;
			}
		};
	}, [currentUser, friendUserId, join, onType, roomId, setCurrentFriend, setMessages, toPayload]);

	const sendMessage = useCallback(
		(content: string, options?: SendMessageOptions) => {
			if (!roomId) return;
			const messageType = options?.messageType ?? "text";
			const trimmed = content.trim();
			if (messageType === "text" && !trimmed) return;
			if (messageType === "image" && !options?.attachmentUrl) return;
			send({
				type: "message:send",
				roomId,
				content: trimmed,
				messageType,
				attachmentUrl: options?.attachmentUrl ?? null,
				attachmentObject: options?.attachmentObject ?? null,
			});
		},
		[roomId, send]
	);

	const editMessage = useCallback(
		(messageId: number, content: string) => {
			if (!roomId) return;
			const trimmed = content.trim();
			if (!trimmed) return;
			send({ type: "message:edit", roomId, messageId, content: trimmed });
		},
		[roomId, send]
	);

	const deleteMessage = useCallback(
		(messageId: number) => {
			if (!roomId) return;
			send({ type: "message:delete", roomId, messageId });
		},
		[roomId, send]
	);

	const notifyTypingStart = useCallback(() => {
		if (!roomId) return;
		send({ type: "typing:start", roomId });
	}, [roomId, send]);

	const notifyTypingStop = useCallback(() => {
		if (!roomId) return;
		send({ type: "typing:stop", roomId });
	}, [roomId, send]);

	return {
		sendMessage,
		messages,
		editMessage,
		deleteMessage,
		notifyTypingStart,
		notifyTypingStop,
		isFriendTyping,
		isFriendOnline,
	};
}
