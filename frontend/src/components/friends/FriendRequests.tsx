import { useEffect, useState } from "react";
import { getFriendRequests, respondToFriendRequest } from "../../services/api/friend";
import type { FriendRequestStatus } from "../../types/friend";

type Props = {
  onResponded?: () => void;
};

type FriendRequest = {
  id: number;
  requester_id: number;
  status: "pending" | "accepted" | "declined";
  requester?: {
    id: number;
    nickname: string;
    avatar_url?: string;
  };
};

const FriendRequests = ({ onResponded }: Props) => {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState<Record<number, boolean>>({});

  // フレンド申請一覧を取得
  const fetchRequests = async () => {
    try {
      const res = await getFriendRequests();
      setRequests(res ?? []);
    } catch (error) {
      console.error("❌ フレンド申請の取得に失敗しました", error);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchRequests();
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  // 承認 / 拒否
  const handleRespond = async (id: number, accepted: boolean) => {
    const status: FriendRequestStatus = accepted ? "accepted" : "declined";
    setLoading((prev) => ({ ...prev, [id]: true }));

    try {
      await respondToFriendRequest(id, status);
      await fetchRequests();
      onResponded?.();
    } catch (error) {
      console.error("❌ 応答に失敗しました", error);
    } finally {
      setLoading((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  };

  return (
    <div className="p-4">
      {requests.length === 0 ? (
        <p className="text-sm text-gray-400">申請はありません</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((req) => {
            const avatar = req.requester?.avatar_url;
            const name = req.requester?.nickname ?? `User#${req.requester_id}`;
            const isLoading = !!loading[req.id];

            return (
              <li
                key={req.id}
                className="flex items-center justify-between bg-gray-800 p-2 rounded"
              >
                {/* 左：アイコンと名前 */}
                <div className="flex items-center gap-3">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-600" />
                  )}
                  <span className="text-sm font-medium">{name}</span>
                </div>

                {/* 右：承認／拒否ボタン */}
                <div className="space-x-2">
                  <button
                    onClick={() => handleRespond(req.id, true)}
                    className="px-3 py-1 bg-green-500 rounded text-white text-sm disabled:opacity-50"
                    disabled={isLoading}
                  >
                    承認
                  </button>
                  <button
                    onClick={() => handleRespond(req.id, false)}
                    className="px-3 py-1 bg-red-500 rounded text-white text-sm disabled:opacity-50"
                    disabled={isLoading}
                  >
                    拒否
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FriendRequests;
