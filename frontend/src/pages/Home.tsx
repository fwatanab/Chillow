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
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#292b31]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="px-3 py-1 rounded bg-gray-700 text-white mr-1"
              onClick={() => navigate("/")}
            >
              戻る
            </button>
            <div className="relative">
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
              {selectedFriend.is_online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-discord-background" />
              )}
            </div>
            <div>
              <p className="font-semibold">{selectedFriend.friend_nickname}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-discord-background">
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
      <div className="w-px bg-gray-800" />
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
