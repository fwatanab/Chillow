import { useEffect, useMemo, useState } from "react";
import axios from "../../utils/axios";
import type { Friend } from "../../types/friend";

type Props = {
  onSelectFriend: (friend: Friend) => void;
  friends?: Friend[];
  loading?: boolean;
  error?: string | null;
};

const formatListTimestamp = (value?: string | null) => {
	if (!value) return "";
	const date = new Date(value);
	const now = new Date();
	const sameDay =
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth() &&
		date.getDate() === now.getDate();
	return sameDay
		? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
		: `${date.getMonth() + 1}/${date.getDate()}`;
};

const buildLastMessagePreview = (friend: Friend) => {
	if (!friend.last_message_id) {
		return "まだ会話がありません";
	}
	if (friend.last_message_is_deleted) {
		return "削除済みのメッセージ";
	}
	const ownLabel = friend.last_message_is_own ? "あなた" : friend.friend_nickname;
	switch (friend.last_message_type) {
		case "image":
			return `${ownLabel} : 画像`;
		case "sticker":
			return `${ownLabel} : スタンプ`;
		default:
			return `${ownLabel} : ${friend.last_message_content ?? ""}`;
	}
};

const FriendList = ({ onSelectFriend, friends, loading, error }: Props) => {
	const [internalFriends, setInternalFriends] = useState<Friend[]>([]);
	const [internalLoading, setInternalLoading] = useState(false);
	const [internalError, setInternalError] = useState<string | null>(null);

  const fetchFriends = async () => {
    try {
      setInternalLoading(true);
      setInternalError(null);
      const res = await axios.get("/friends");
      setInternalFriends(res.data ?? []);
    } catch (e) {
      console.error("❌ フレンド取得失敗", e);
      setInternalError("フレンドの取得に失敗しました");
    } finally {
      setInternalLoading(false);
    }
  };

  useEffect(() => {
    if (typeof friends !== "undefined") return;
    fetchFriends();
  }, [friends]);

	const displayFriends = useMemo(() => (typeof friends !== "undefined" ? friends : internalFriends), [friends, internalFriends]);
  const isLoading = typeof loading !== "undefined" ? loading : internalLoading;
  const err = typeof error !== "undefined" ? error : internalError;

  return (
    <div className="space-y-2 p-2">
      <h3 className="text-lg font-semibold mb-2">フレンド一覧</h3>

      {isLoading && <p className="text-sm text-gray-400">読み込み中...</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}

      {!isLoading && !err && displayFriends.length === 0 && (
        <div className="text-sm text-gray-400 space-y-2">
          <p>フレンドがいません</p>
        </div>
      )}

		{!isLoading &&
			!err &&
			displayFriends.map((f) => {
				const unreadCount = f.unread_count ?? 0;
				const hasUnread = unreadCount > 0;
				return (
					<div
						key={f.id ?? `${f.user_id}-${f.friend_id}`}
						className="cursor-pointer hover:bg-gray-700 p-3 rounded flex gap-3"
						onClick={() => onSelectFriend(f)}
					>
						<div className="relative">
							{f.friend_avatar_url ? (
								<img
									src={f.friend_avatar_url}
									alt={f.friend_nickname}
									className="w-10 h-10 rounded-full object-cover"
								/>
							) : (
								<div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm">
									?
								</div>
							)}
							{f.is_online && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-gray-800" />}
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center justify-between text-sm">
								<span className="font-semibold truncate">{f.friend_nickname}</span>
								<span className="text-xs text-gray-400">{formatListTimestamp(f.last_message_at)}</span>
							</div>
							<div className="flex items-center justify-between text-xs text-gray-400 gap-2">
								<p className="truncate flex-1">{buildLastMessagePreview(f)}</p>
								{hasUnread ? (
									<span className="bg-discord-accent text-white text-[11px] px-2 py-0.5 rounded-full">{unreadCount}</span>
								) : (
									<span className="text-gray-500">既読</span>
								)}
							</div>
						</div>
					</div>
				);
			})}
    </div>
  );
};

export default FriendList;
