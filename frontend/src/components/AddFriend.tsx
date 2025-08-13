import { useState } from "react";
import { useRecoilValue } from "recoil";
import { currentUserState } from "../store/auth";
import { sendFriendRequest } from "../api/friend";
import { searchUserByCode } from "../api/user";

const AddFriend = () => {
	const [code, setCode] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const currentUser = useRecoilValue(currentUserState);

	const handleAddFriend = async () => {
		if (!code.trim()) {
			setMessage("⚠️ フレンドコードを入力してください");
			return;
		}

		if (!currentUser) {
			setMessage("⚠️ ユーザー情報が取得できません");
			return;
		}

		setLoading(true);
		setMessage(null);

		try {
			// フレンドコードでユーザーを検索
			const receiver = await searchUserByCode(code);

			if (!receiver || receiver.id === currentUser.id) {
				setMessage("❌ 無効なフレンドコードです");
				return;
			}

			// フレンド申請送信
			await sendFriendRequest(receiver.id);

			setMessage("✅ フレンド申請を送信しました");
			setCode("");
		} catch (error: any) {
			if (error.response?.data?.error) {
				setMessage(`❌ ${error.response.data.error}`);
			} else {
				setMessage("❌ エラーが発生しました");
			}
		} finally {
			setLoading(false);
		}
	};


	return (
		<div className="add-friend">
			<h3>フレンドを追加</h3>
			<input
				type="text"
				value={code}
				onChange={(e) => setCode(e.target.value)}
				placeholder="フレンドコードを入力"
				disabled={loading}
			/>
			<button onClick={handleAddFriend} disabled={loading}>
				{loading ? "送信中..." : "申請する"}
			</button>
			{message && <p>{message}</p>}
		</div>
	);
};

export default AddFriend;
