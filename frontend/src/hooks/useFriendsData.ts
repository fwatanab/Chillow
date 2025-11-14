import { useCallback, useEffect, useRef, useState } from "react";
import { useRecoilValue } from "recoil";
import type { Friend } from "../types/friend";
import { getFriends } from "../services/api/friend";
import { useWebSocket } from "./useWebSocket";
import type { MessageDTO } from "../types/ws";
import { currentUserState } from "../store/auth";
import { currentChatFriendState } from "../recoil/chatState";
import { buildRoomId } from "../utils/chat";

export function useFriendsData() {
	const [friends, setFriends] = useState<Friend[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { onType, join } = useWebSocket();
	const currentUser = useRecoilValue(currentUserState);
	const activeFriendId = useRecoilValue(currentChatFriendState);
	const joinedRoomsRef = useRef<Set<string>>(new Set());

	const reload = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const list = await getFriends();
			setFriends((prev) => {
				const onlineLookup = new Map(prev.map((f) => [f.friend_id, f.is_online ?? false]));
				return list.map((f) => ({
					...f,
					is_online: onlineLookup.get(f.friend_id) ?? false,
					unread_count: f.unread_count ?? 0,
				}));
			});
		} catch (err) {
			console.error("❌ フレンド取得失敗", err);
			setError("フレンドの取得に失敗しました");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		reload();
	}, [reload]);

	useEffect(() => {
		if (!currentUser) return;
		friends.forEach((friend) => {
			const roomId = buildRoomId(currentUser.id, friend.friend_id);
			if (!joinedRoomsRef.current.has(roomId)) {
				join(roomId);
				joinedRoomsRef.current.add(roomId);
			}
		});
	}, [friends, currentUser, join]);

	const parseFriendIdFromRoom = useCallback((roomId: string) => {
		if (!currentUser) return null;
		const [a, b] = roomId.split("-").map((id) => Number(id));
		if (a === currentUser.id) return b;
		if (b === currentUser.id) return a;
		return null;
	}, [currentUser]);

	const applyMessageMeta = useCallback(
		(dto: MessageDTO, type: "new" | "updated" | "deleted") => {
			const friendId = parseFriendIdFromRoom(dto.room_id);
			if (!friendId) return;
			const isOwn = dto.sender_id === currentUser?.id;
			setFriends((prev) =>
				prev.map((friend) => {
					if (friend.friend_id !== friendId) return friend;
					if (type !== "new" && friend.last_message_id && friend.last_message_id !== dto.id) {
						return friend;
					}
					const nextUnread = !isOwn
						? activeFriendId === friend.friend_id
							? 0
							: type === "new"
							? (friend.unread_count ?? 0) + 1
							: friend.unread_count ?? 0
						: friend.unread_count ?? 0;
					return {
						...friend,
						last_message_id: dto.id,
						last_message_content: dto.content,
						last_message_type: dto.message_type,
						last_message_attachment_url: dto.attachment_url ?? null,
						last_message_at: dto.created_at,
						last_message_edited_at: dto.edited_at ?? null,
						last_message_is_deleted: dto.is_deleted,
						last_message_is_own: isOwn,
						last_message_sender_id: dto.sender_id,
						unread_count: nextUnread,
					};
				})
			);
		},
		[activeFriendId, currentUser?.id, parseFriendIdFromRoom]
	);

	useEffect(() => {
		const offNew = onType("message:new", (event) => applyMessageMeta(event.message, "new"));
		const offUpdated = onType("message:updated", (event) => applyMessageMeta(event.message, "updated"));
		const offDeleted = onType("message:deleted", (event) => applyMessageMeta(event.message, "deleted"));
		const offRead = onType("message:read", (event) => applyMessageMeta(event.message, "updated"));
		const offPresence = onType("presence:update", (event) => {
			const friendId = parseFriendIdFromRoom(event.roomId);
			if (!friendId) return;
			setFriends((prev) =>
				prev.map((friend) =>
					friend.friend_id === friendId
						? { ...friend, is_online: event.users.includes(friendId) }
						: friend
				)
			);
		});
		return () => {
			offNew();
			offUpdated();
			offDeleted();
			offRead();
			offPresence();
		};
	}, [applyMessageMeta, onType, parseFriendIdFromRoom]);

	useEffect(() => {
		if (!activeFriendId) return;
		setFriends((prev) => prev.map((friend) => (friend.friend_id === activeFriendId ? { ...friend, unread_count: 0 } : friend)));
	}, [activeFriendId]);

	return { friends, loading, error, reload };
}
