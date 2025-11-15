import { useRecoilValue, useSetRecoilState } from "recoil";
import { useNavigate } from "react-router-dom";
import { logout } from "../services/api/auth";
import { authLoadingState, currentUserState } from "../store/auth";
import { clearStoredUser } from "../utils/authStorage";
import Sidebar from "../components/layout/Sidebar";
import { useFriendsData } from "../hooks/useFriendsData";
import { useIsMobile } from "../hooks/useIsMobile";

const Mypage = () => {
  const currentUser = useRecoilValue(currentUserState);
  const setUser = useSetRecoilState(currentUserState);
  const setLoading = useSetRecoilState(authLoadingState);
  const navigate = useNavigate();
  const { friends, loading, error } = useFriendsData();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("❌ ログアウトに失敗しました", err);
    } finally {
      clearStoredUser();
      setUser(null);
      setLoading(false);
      navigate("/login");
    }
  };

  if (!currentUser) {
    return (
      <div className="p-6">
        <p>ユーザー情報を取得できませんでした。</p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="h-screen bg-discord-background text-discord-text flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-gray-800 bg-[#292b31]">
          <button
            type="button"
            className="px-3 py-1 rounded bg-gray-700 text-white mr-1"
            onClick={() => navigate("/")}
          >
            戻る
          </button>
          <h1 className="text-lg font-semibold">マイページ</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-discord-background">
          <div className="space-y-2">
            <p>ニックネーム: {currentUser.nickname}</p>
            <p>メール: {currentUser.email}</p>
            <p>フレンドコード: {currentUser.friend_code}</p>
            <p>権限: {currentUser.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 w-full"
          >
            ログアウト
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-discord-background text-discord-text">
      <Sidebar
        currentUser={currentUser}
        friends={friends}
        friendsLoading={loading}
        friendsError={error}
        onSelectFriend={(friend) => navigate(`/chat/${friend.friend_id}`)}
        onOpenFriendManage={() => navigate("/friends/manage")}
      />
      <main className="flex-1 p-6 space-y-4">
        <h1 className="text-2xl font-bold">マイページ</h1>
        <div className="space-y-2">
          <p>ニックネーム: {currentUser.nickname}</p>
          <p>メール: {currentUser.email}</p>
          <p>フレンドコード: {currentUser.friend_code}</p>
          <p>権限: {currentUser.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          ログアウト
        </button>
      </main>
    </div>
  );
};

export default Mypage;
