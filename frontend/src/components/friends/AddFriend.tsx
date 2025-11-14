import { useMemo, useState } from "react";
import { useRecoilValue } from "recoil";
import { currentUserState } from "../../store/auth";
import { sendFriendRequest } from "../../services/api/friend";
import { searchUserByCode } from "../../services/api/user";
import type { Friend } from "../../types/friend";
import type { User } from "../../types/user";

type Props = {
	onFriendAdded?: () => void;
	existingFriends?: Friend[];
};

const AddFriend = ({ onFriendAdded, existingFriends }: Props) => {
	const [code, setCode] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [candidate, setCandidate] = useState<User | null>(null);
	const [searching, setSearching] = useState(false);
	const currentUser = useRecoilValue(currentUserState);

	const commonFriendsCount = useMemo(() => {
		if (!candidate || !existingFriends) return 0;
		return existingFriends.filter((f) => f.friend_id === candidate.id).length;
	}, [candidate, existingFriends]);

	const handleSearch = async () => {
		if (!code.trim()) {
			setMessage("⚠️ フレンドコードを入力してください");
			return;
		}
		setSearching(true);
		setMessage(null);
		try {
			const receiver = await searchUserByCode(code.trim());
			if (!receiver) {
				setCandidate(null);
				setMessage("❌ ユーザーが見つかりませんでした");
				return;
			}
			setCandidate(receiver);
		} catch (error: any) {
			setCandidate(null);
			if (error.response?.data?.error) {
				setMessage(`❌ ${error.response.data.error}`);
			} else {
				setMessage("❌ 検索中にエラーが発生しました");
			}
		} finally {
			setSearching(false);
		}
	};

	const handleAddFriend = async () => {
		if (!candidate) {
			setMessage("⚠️ 先にフレンドコードを検索してください");
			return;
		}
		if (!currentUser || candidate.id === currentUser.id) {
			setMessage("⚠️ 無効なユーザーです");
			return;
		}

		setLoading(true);
		setMessage(null);
		try {
			await sendFriendRequest(candidate.id);
			setMessage("✅ フレンド申請を送信しました");
			setCode("");
			setCandidate(null);
			onFriendAdded?.();
		} catch (error: any) {
			if (error.response?.data?.error) {
				setMessage(`❌ ${error.response.data.error}`);
			} else {
				setMessage("❌ 申請中にエラーが発生しました");
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex gap-2">
				<input
					type="text"
					value={code}
					onChange={(e) => setCode(e.target.value)}
					placeholder="フレンドコードを入力"
					className="flex-1 px-3 py-2 rounded bg-gray-700 text-white"
					disabled={loading || searching}
				/>
				<button
					onClick={handleSearch}
					className="px-3 py-2 bg-discord-accent text-white rounded"
					disabled={loading || searching}
				>
					{searching ? "検索中..." : "検索"}
				</button>
			</div>

			{candidate && (
				<div className="bg-gray-800 p-3 rounded space-y-2">
					<div className="flex items-center gap-3">
						{candidate.avatar_url ? (
							<img src={candidate.avatar_url} alt={candidate.nickname} className="w-12 h-12 rounded-full object-cover" />
						) : (
							<div className="w-12 h-12 rounded-full bg-gray-600" />
						)}
						<div>
							<p className="font-semibold">{candidate.nickname}</p>
							<p className="text-sm text-gray-400">{candidate.email}</p>
						</div>
					</div>
					<p className="text-sm">フレンドコード: {candidate.friend_code}</p>
					<p className="text-sm">共通の友達: {commonFriendsCount}</p>
					<button
						onClick={handleAddFriend}
						className="mt-2 px-3 py-2 bg-discord-accent text-white rounded"
						disabled={loading}
					>
						{loading ? "送信中..." : "このユーザーに申請"}
					</button>
				</div>
			)}

			{message && <p className="text-sm text-red-400">{message}</p>}
		</div>
	);
};

export default AddFriend;
