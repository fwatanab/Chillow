import { useCallback, useEffect, useState } from "react";
import type { Friend } from "../types/friend";
import { getFriends } from "../services/api/friend";

export function useFriendsData() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getFriends();
      setFriends(list);
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

  return { friends, loading, error, reload };
}
