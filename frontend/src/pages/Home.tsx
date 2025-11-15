import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { currentUserState } from "../store/auth";
import Sidebar from "../components/layout/Sidebar";
import ChatRoom from "../components/chat/ChatRoom";
import type { Friend } from "../types/friend";
import { useFriendsData } from "../hooks/useFriendsData";
import { useIsMobile } from "../hooks/useIsMobile";

const Home = () => {
  const { friends, loading: friendsLoading, error: friendsError } = useFriendsData();
  const currentUser = useRecoilValue(currentUserState);
  const { friendId } = useParams<{ friendId?: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const selectedFriend = useMemo(() => {
    if (!friendId) return null;
    return friends.find(
      (f) => String(f.friend_id) === friendId || String(f.id) === friendId
    ) ?? null;
  }, [friends, friendId]);

  const handleSelectFriend = (friend: Friend) => {
    navigate(`/chat/${friend.friend_id}`);
  };

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-400">
        ログイン状態を確認中...
      </div>
    );
  }

  if (isMobile) {
    if (!selectedFriend) {
      return (
        <div className="h-screen text-discord-text bg-discord-background">
          <Sidebar
            currentUser={currentUser}
            friends={friends}
            friendsLoading={friendsLoading}
            friendsError={friendsError}
            onSelectFriend={handleSelectFriend}
            onOpenFriendManage={() => navigate("/friends/manage")}
            isMobile
          />
        </div>
      );
    }
    return (
      <div className="h-screen flex flex-col text-discord-text bg-discord-background">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1 rounded bg-gray-700 text-white"
              onClick={() => navigate("/")}
            >
              戻る
            </button>
            {selectedFriend.friend_avatar_url ? (
              <img
                src={selectedFriend.friend_avatar_url}
                alt={selectedFriend.friend_nickname}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white text-lg">
                {selectedFriend.friend_nickname?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              <p className="font-semibold">{selectedFriend.friend_nickname}</p>
              <p className="text-xs text-gray-400">
                {selectedFriend.is_online ? "オンライン" : "オフライン"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <ChatRoom friend={selectedFriend} showHeader={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen text-discord-text bg-discord-background">
      <Sidebar
        currentUser={currentUser}
        friends={friends}
        friendsLoading={friendsLoading}
        friendsError={friendsError}
        onSelectFriend={handleSelectFriend}
        onOpenFriendManage={() => navigate("/friends/manage")}
      />

      <main className="flex-1 flex flex-col">
        {selectedFriend ? (
          <ChatRoom friend={selectedFriend} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            フレンドを選択してください
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;


// import FriendList from "../components/FriendList";
// import ChatRoom from "../components/ChatRoom";
// import FriendRequests from "../components/FriendRequests";
// import type { Friend } from "../types/friend";
// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { useRecoilValue } from "recoil";
// import { currentUserState } from "../store/auth";
// 
// // const Home = () => {
// // 	console.log("✅ Home loaded")
// // 
// // 	return (
// // 		// Home.tsx など
// // 		<div className="flex h-screen">
// // 			{/* サイドバー */}
// // 			<aside className="w-1/3 max-w-sm bg-discord-sidebar text-discord-text p-4 overflow-y-auto">
// // 				<FriendList />
// // 				<FriendRequests />
// // 				<AddFriend />
// // 			</aside>
// // 			
// // 			{/* メインビュー */}
// // 			<main className="flex-1 bg-discord-background text-discord-text p-4 flex flex-col">
// // 				<ChatRoom />
// // 			</main>
// // 		</div>
// // 
// // 	);
// // };
// 
// const Home = () => {
//   const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
//   const [showFriendRequests, setShowFriendRequests] = useState(false);
//   const currentUser = useRecoilValue(currentUserState);
//   const navigate = useNavigate();
// 
//   return (
//     <div className="flex h-screen text-discord-text bg-discord-background">
//       {/* Left Sidebar */}
//       <aside className="w-72 bg-discord-sidebar flex flex-col">
//         {/* Top Section */}
//         <div className="flex items-center justify-between p-4 border-b border-gray-700">
//           <h2 className="text-lg font-bold">フレンド</h2>
//           <button
//             onClick={() => setShowFriendRequests(!showFriendRequests)}
//             className="hover:text-discord-accent"
//             title="フレンド申請"
//           >
//             ➕
//           </button>
//         </div>
// 
//         {/* Friend List */}
//         <div className="flex-1 overflow-y-auto">
//           <FriendList onSelectFriend={setSelectedFriend} />
//         </div>
// 
//         {/* Bottom: Current User */}
//         <div
//           className="p-4 border-t border-gray-700 cursor-pointer hover:bg-discord-accent/10"
//           onClick={() => navigate("/mypage")}
//         >
//           <p className="text-sm font-semibold">{currentUser?.nickname}</p>
//         </div>
//       </aside>
// 
//       {/* Right Main Panel */}
//       <main className="flex-1 flex flex-col">
//         {showFriendRequests ? (
//           <FriendRequests />
//         ) : selectedFriend ? (
//           <ChatRoom friend={selectedFriend} />
//         ) : (
//           <div className="flex items-center justify-center h-full text-gray-400">
//             フレンドを選択してください
//           </div>
//         )}
//       </main>
//     </div>
//   );
// };
// 
// 
// export default Home;
// 
