import { useState } from "react";
import { useRecoilValue } from "recoil";
import { currentUserState } from "../../store/auth";
import { sendFriendRequest } from "../../services/api/friend";
import { searchUserByCode } from "../../services/api/user";
import type { User } from "../../types/user";

type Props = {
	onFriendAdded?: () => void;
};

const AddFriend = ({ onFriendAdded }: Props) => {
	const [code, setCode] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [messageTone, setMessageTone] = useState<"success" | "error">("error");
	const [loading, setLoading] = useState(false);
	const [candidate, setCandidate] = useState<User | null>(null);
	const [searching, setSearching] = useState(false);
	const currentUser = useRecoilValue(currentUserState);

	const setFeedback = (text: string | null, tone: "success" | "error" = "error") => {
		setMessage(text);
		setMessageTone(tone);
	};

	const handleSearch = async () => {
		if (!code.trim()) {
			setFeedback("⚠️ フレンドコードを入力してください");
			return;
		}
		setSearching(true);
		setFeedback(null);
		try {
			const receiver = await searchUserByCode(code.trim());
			if (!receiver) {
				setCandidate(null);
				setFeedback("❌ ユーザーが見つかりませんでした");
				return;
			}
			setCandidate(receiver);
		} catch (error: any) {
			setCandidate(null);
			if (error.response?.data?.error) {
				setFeedback(`❌ ${error.response.data.error}`);
			} else {
				setFeedback("❌ 検索中にエラーが発生しました");
			}
		} finally {
			setSearching(false);
		}
	};

	const handleAddFriend = async () => {
		if (!candidate) {
			setFeedback("⚠️ 先にフレンドコードを検索してください");
			return;
		}
		if (!currentUser || candidate.id === currentUser.id) {
			setFeedback("⚠️ 無効なユーザーです");
			return;
		}

		setLoading(true);
		setFeedback(null);
		try {
			await sendFriendRequest(candidate.id);
			setFeedback("✅ フレンド申請を送信しました", "success");
			setCode("");
			setCandidate(null);
			onFriendAdded?.();
		} catch (error: any) {
			if (error.response?.data?.error) {
				setFeedback(`❌ ${error.response.data.error}`);
			} else {
				setFeedback("❌ 申請中にエラーが発生しました");
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
			<button
				onClick={handleAddFriend}
				className="mt-2 px-3 py-2 bg-discord-accent text-white rounded"
				disabled={loading}
			>
						{loading ? "送信中..." : "このユーザーに申請"}
					</button>
				</div>
			)}

			{message && <p className={`text-sm ${messageTone === "success" ? "text-green-400" : "text-red-400"}`}>{message}</p>}
		</div>
	);
};

export default AddFriend;
