import AddFriend from "../components/friends/AddFriend";
import FriendRequests from "../components/friends/FriendRequests";
import { useNavigate } from "react-router-dom";

const FriendManage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-discord-background text-discord-text p-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-discord-accent hover:underline"
      >
        ← 戻る
      </button>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-discord-sidebar p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">フレンドを追加</h2>
          <AddFriend />
        </div>
        <div className="bg-discord-sidebar p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">フレンド申請</h2>
          <FriendRequests />
        </div>
      </div>
    </div>
  );
};

export default FriendManage;
