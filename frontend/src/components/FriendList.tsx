import type { Friend } from "../types/friend";
import { useEffect, useState } from "react";
import axios from "../utils/axios";

type Props = {
	onSelectFriend: (friend: Friend) => void;
};

const FriendList = ({ onSelectFriend }: Props) => {
	const [friends, setFriends] = useState<Friend[]>([]);

	useEffect(() => {
		const fetchFriends = async () => {
			const res = await axios.get("/friends");
			setFriends(res.data);
		};

		fetchFriends();
	}, []);

	return (
		<div className="space-y-2 p-2">
			{friends.map((friend) => (
				<div
					key={friend.id}
					className="cursor-pointer hover:bg-gray-700 p-2 rounded"
					onClick={() => onSelectFriend(friend)}
				>
					{friend.user_nickname} </div>
			))}
		</div>
	);
};

export default FriendList;



// import { useEffect, useState } from "react";
// import { getFriends, deleteFriend } from "../api/friend";
// import type { Friend } from "../types/friend";
// 
// const FriendList = () => {
// 	const [friends, setFriends] = useState<Friend[]>([]);
// 
// 	useEffect(() => {
// 		const fetchFriends = async () => {
// 			try {
// 				const data = await getFriends();
// 				setFriends(data);
// 			} catch (err) {
// 				console.error("❌ フレンド取得失敗", err);
// 			}
// 			fetchFriends();
// 		};
// 	}, []);
// 
// 	const handleDelete = async (friendId: number) => {
// 		try {
// 			await deleteFriend(friendId);
// 			setFriends(prev => prev.filter(f => f.friend_id !== friendId));
// 		} catch (err) {
// 			console.error("❌ フレンド削除失敗", err);
// 		}
// 	};
// 
// 	return (
// 		<div>
// 			<h2>フレンド一覧</h2>
// 			<ul>
// 				{friends.map(friend => (
// 					<li key={friend.friend_id}>
// 						{friend.friend_id}（仮）{/* 実際にはフレンドの名前取得が必要 */}
// 						<button onClick={() => handleDelete(friend.friend_id)}>削除</button>
// 					</li>
// 				))}
// 			</ul>
// 		</div>
// 	);
// };
// 
// export default FriendList;
