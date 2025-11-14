import { useEffect, useState } from "react";
import axios from "../../utils/axios";
import type { Friend } from "../../types/friend";

type Props = {
  onSelectFriend: (friend: Friend) => void;
  friends?: Friend[];
  loading?: boolean;
  error?: string | null;
  onReload?: () => void;
};

const FriendList = ({ onSelectFriend, friends, loading, error, onReload }: Props) => {
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

  const displayFriends = typeof friends !== "undefined" ? friends : internalFriends;
  const isLoading = typeof loading !== "undefined" ? loading : internalLoading;
  const err = typeof error !== "undefined" ? error : internalError;

  const handleReload = () => {
    if (onReload) {
      onReload();
    } else {
      fetchFriends();
    }
  };

  return (
    <div className="space-y-2 p-2">
      <h3 className="text-lg font-semibold mb-2">フレンド一覧</h3>

      {isLoading && <p className="text-sm text-gray-400">読み込み中...</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}

      {!isLoading && !err && displayFriends.length === 0 && (
        <div className="text-sm text-gray-400 space-y-2">
          <p>フレンドがいません</p>
          <button
            type="button"
            className="text-discord-accent underline"
            onClick={handleReload}
          >
            再読み込み
          </button>
        </div>
      )}

      {!isLoading &&
        !err &&
        displayFriends.map((f) => (
          <div
            key={f.id ?? `${f.user_id}-${f.friend_id}`}
            className="cursor-pointer hover:bg-gray-700 p-2 rounded flex items-center gap-3"
            onClick={() => onSelectFriend(f)}
          >
            {/* 🖼️ アイコン */}
            {f.friend_avatar_url ? (
              <img
                src={f.friend_avatar_url}
                alt={f.friend_nickname}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              // デフォルトアイコン（なければプレースホルダー）
              <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm">
                ?
              </div>
            )}

            {/* 🏷️ ニックネーム */}
            <span className="text-sm font-medium">{f.friend_nickname}</span>
          </div>
        ))}
    </div>
  );
};

export default FriendList;
