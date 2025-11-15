import { useState } from "react";
import type { Friend } from "../../types/friend";
import { deleteFriend } from "../../services/api/friend";

type Props = {
	friends: Friend[];
	loading: boolean;
	error: string | null;
	onReload: () => void;
};

const FriendManageList = ({ friends, loading, error, onReload }: Props) => {
	const [deletingId, setDeletingId] = useState<number | null>(null);
	const [feedback, setFeedback] = useState<string | null>(null);

	const handleDelete = async (friendId: number, nickname: string) => {
		if (!window.confirm(`${nickname} をフレンドから削除しますか？`)) return;
		try {
			setDeletingId(friendId);
			setFeedback(null);
			await deleteFriend(friendId);
			setFeedback(`${nickname} を削除しました`);
			onReload();
		} catch (err) {
			console.error("❌ フレンド削除に失敗", err);
			setFeedback("削除に失敗しました。時間をおいて再試行してください");
		} finally {
			setDeletingId(null);
		}
	};

	return (
		<div className="space-y-4">
			<h2 className="text-xl font-semibold">フレンド管理</h2>
			{feedback && <p className="text-sm text-gray-300">{feedback}</p>}
			{loading && <p className="text-sm text-gray-400">読み込み中...</p>}
			{error && <p className="text-sm text-red-400">{error}</p>}
			{!loading && !error && friends.length === 0 && <p className="text-sm text-gray-400">フレンドがいません</p>}
			{!loading && !error && friends.length > 0 && (
				<ul className="divide-y divide-gray-700">
					{friends.map((friend) => (
						<li key={friend.friend_id} className="flex items-center justify-between py-3 gap-4">
							<div className="flex items-center gap-3">
								{friend.friend_avatar_url ? (
									<img src={friend.friend_avatar_url} alt={friend.friend_nickname} className="w-10 h-10 rounded-full object-cover" />
								) : (
									<div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm">?</div>
								)}
								<div>
									<p className="font-medium">{friend.friend_nickname}</p>
									<p className="text-xs text-gray-400">ID: {friend.friend_id}</p>
								</div>
							</div>
							<button
								type="button"
								className="text-sm px-3 py-1 rounded bg-red-500/80 hover:bg-red-500 disabled:opacity-50"
								onClick={() => handleDelete(friend.friend_id, friend.friend_nickname)}
								disabled={deletingId === friend.friend_id}
							>
								{deletingId === friend.friend_id ? "削除中..." : "削除"}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

export default FriendManageList;
