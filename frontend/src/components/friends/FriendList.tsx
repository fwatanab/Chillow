import { useEffect, useState } from "react";
import axios from "../../utils/axios";
import type { Friend } from "../../types/friend";

type Props = {
  onSelectFriend: (friend: Friend) => void;
};

const FriendList = ({ onSelectFriend }: Props) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      setErr(null);
      const res = await axios.get("/friends"); // => [] of Friend
      setFriends(res.data ?? []);
    } catch (e) {
      console.error("❌ フレンド取得失敗", e);
      setErr("フレンドの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  return (
    <div className="space-y-2 p-2">
      <h3 className="text-lg font-semibold mb-2">フレンド一覧</h3>

      {loading && <p className="text-sm text-gray-400">読み込み中...</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}

      {!loading && !err && friends.length === 0 && (
        <p className="text-sm text-gray-400">フレンドがいません</p>
      )}

      {!loading &&
        !err &&
        friends.map((f) => (
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

