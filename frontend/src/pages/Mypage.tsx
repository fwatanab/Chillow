import { useRecoilValue, useSetRecoilState } from "recoil";
import { useNavigate } from "react-router-dom";
import { logout } from "../services/api/auth";
import { authLoadingState, currentUserState } from "../store/auth";

const Mypage = () => {
  const currentUser = useRecoilValue(currentUserState);
  const setUser = useSetRecoilState(currentUserState);
  const setLoading = useSetRecoilState(authLoadingState);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("❌ ログアウトに失敗しました", err);
    } finally {
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

  return (
    <div className="p-6 space-y-4">
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
    </div>
  );
};

export default Mypage;
