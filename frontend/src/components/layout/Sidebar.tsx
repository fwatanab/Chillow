import SidebarHeader from "./SidebarHeader";
import FriendList from "../friends/FriendList";
import SidebarFooter from "./SidebarFooter";
import type { Friend } from "../../types/friend";
import type { User } from "../../types/user";

type Props = {
	currentUser: User | null;
	friends: Friend[];
	friendsLoading: boolean;
	friendsError: string | null;
	onReloadFriends: () => void;
	onSelectFriend: (friend: Friend) => void;
	onOpenFriendManage: () => void;
};

const Sidebar = ({
	currentUser,
	friends,
	friendsLoading,
	friendsError,
	onReloadFriends,
	onSelectFriend,
	onOpenFriendManage,
}: Props) => {
	return (
		<aside className="w-72 bg-discord-sidebar flex flex-col">
			<SidebarHeader
				onOpenFriendManage={onOpenFriendManage}
			/>
			<div className="flex-1 overflow-y-auto">
				<FriendList
					onSelectFriend={onSelectFriend}
					friends={friends}
					loading={friendsLoading}
					error={friendsError}
					onReload={onReloadFriends}
				/>
			</div>
			<SidebarFooter currentUser={currentUser} />
		</aside>
	);
};

export default Sidebar;
