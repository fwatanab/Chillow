import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// import axios from "axios";

interface Friend {
	id: number;
	nickname: string;
	avatar_url: string;
	last_message?: string;
	last_message_time?: string;
}
const ChatList = () => {
	console.log("✅ ChatList rendered");
	const [friends, setFriends] = useState<Friend[]>([]);
	const navigate = useNavigate();

	useEffect(() => {
// ✅ テスト用：仮フレンドデータを表示（API成功しなくてもチャット画面へ遷移可）
		const mockFriends: Friend[] = [
			{
				id: 2,
				nickname: "テストユーザー",
				avatar_url: "https://via.placeholder.com/48",
				last_message: "これはテストメッセージです",
				last_message_time: new Date().toISOString(),
			},
		];
		setFriends(mockFriends); // ✅ 本番ではこの行を削除

// ✅ 本番用：APIで友達一覧を取得
// 🔽 friendsが上書きされるのでbackend実装するまでコメントアウト
// 		const fetchFriends = async () => {
// 		try {
// 			const token = localStorage.getItem("access_token");
// 			const res = await axios.get("/api/friends", {
// 			  headers: { Authorization: `Bearer ${token}` },
// 			});
// 			setFriends(res.data);
// 		} catch (err) {
// 			console.error("友達一覧の取得に失敗しました", err);
// 		}
// 	};
// 
// 	fetchFriends();
	}, []);
	
	const handleClick = (friendId: number) => {
		navigate(`/chat/${friendId}`);
	};

	console.log(friends)

// 	return (
// 		<div className="chat-list">
// 			<h2>チャット一覧</h2>
// 			<ul>
// 				{friends.map((f) => (
// 				  <li key={f.id} className="chat-list-item" onClick={() => handleClick(f.id)}>
// 				    <img src={f.avatar_url} alt={f.nickname} className="avatar" />
// 				    <div className="chat-info">
// 				      <div className="nickname">{f.nickname}</div>
// 				      <div className="last-message">{f.last_message ?? "メッセージなし"}</div>
// 				      <div className="time">{f.last_message_time ? new Date(f.last_message_time).toLocaleTimeString() : ""}</div>
// 				    </div>
// 				  </li>
// 				))}
// 			</ul>
// 		</div>
// 	);


	return (
    <div className="chat-list" style={{ background: "white", color: "black", padding: "1rem" }}>
      <h2 style={{ fontSize: "1.5rem" }}>チャット一覧</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {Array.isArray(friends) && friends.length > 0 ? (
          friends.map((f) => (
            <li
              key={f.id}
              onClick={() => handleClick(f.id)}
              style={{
                margin: "1rem 0",
                padding: "1rem",
                border: "1px solid #ccc",
                borderRadius: "8px",
                background: "#f9f9f9",
                cursor: "pointer",
              }}
            >
              <img
                src={f.avatar_url}
                alt={f.nickname}
                width="40"
                style={{ marginRight: "0.5rem" }}
              />
              <strong>{f.nickname}</strong>
              <div>{f.last_message}</div>
            </li>
          ))
        ) : (
          <li>友達が見つかりません</li>
        )}
      </ul>
    </div>
  );
};

export default ChatList;

