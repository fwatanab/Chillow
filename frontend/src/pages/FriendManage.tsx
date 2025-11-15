import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AddFriend from "../components/friends/AddFriend";
import FriendRequests from "../components/friends/FriendRequests";
import FriendManageList from "../components/friends/FriendManageList";
import Sidebar from "../components/layout/Sidebar";
import { useFriendsData } from "../hooks/useFriendsData";
import { useRecoilValue } from "recoil";
import { currentUserState } from "../store/auth";

const tabs = [
	{ key: "add", label: "フレンド追加" },
	{ key: "requests", label: "申請一覧" },
	{ key: "manage", label: "フレンド管理" },
] as const;

type TabKey = typeof tabs[number]["key"];

const FriendManage = () => {
  const navigate = useNavigate();
  const currentUser = useRecoilValue(currentUserState);
  const { friends, loading, error, reload } = useFriendsData();
  const [activeTab, setActiveTab] = useState<TabKey>("add");

  return (
    <div className="flex h-screen bg-discord-background text-discord-text">
      <Sidebar
        currentUser={currentUser}
        friends={friends}
        friendsLoading={loading}
        friendsError={error}
        onSelectFriend={(friend) => navigate(`/chat/${friend.friend_id}`)}
        onOpenFriendManage={() => {}}
      />
      <main className="flex-1 p-6 space-y-4">
		<div className="flex gap-4 border-b border-gray-700">
			{tabs.map((tab) => (
				<button
					key={tab.key}
					className={`pb-2 px-2 border-b-2 ${
						activeTab === tab.key ? "border-discord-accent text-white" : "border-transparent text-gray-400"
					}`}
					onClick={() => setActiveTab(tab.key)}
				>
					{tab.label}
				</button>
			))}
		</div>
		{activeTab === "add" && (
			<div className="bg-discord-sidebar p-4 rounded shadow">
				<AddFriend onFriendAdded={reload} existingFriends={friends} />
			</div>
		)}
		{activeTab === "requests" && (
			<div className="bg-discord-sidebar p-4 rounded shadow">
				<FriendRequests onResponded={reload} />
			</div>
		)}
		{activeTab === "manage" && (
			<div className="bg-discord-sidebar p-4 rounded shadow">
				<FriendManageList friends={friends} loading={loading} error={error} onReload={reload} />
			</div>
		)}
      </main>
    </div>
  );
};

export default FriendManage;
