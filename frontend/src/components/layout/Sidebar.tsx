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
	onSelectFriend: (friend: Friend) => void;
	onOpenFriendManage: () => void;
	isMobile?: boolean;
};

const Sidebar = ({
	currentUser,
	friends,
	friendsLoading,
	friendsError,
	onSelectFriend,
	onOpenFriendManage,
	isMobile = false,
}: Props) => {
	const containerClass = isMobile ? "w-full h-full" : "w-72";

	return (
		<aside className={`bg-discord-sidebar flex flex-col ${containerClass}`}>
			<SidebarHeader onOpenFriendManage={onOpenFriendManage} isMobile={isMobile} />
			<div className="flex-1 overflow-y-auto">
				<FriendList
					onSelectFriend={onSelectFriend}
					friends={friends}
					loading={friendsLoading}
					error={friendsError}
				/>
			</div>
			<SidebarFooter currentUser={currentUser} />
		</aside>
	);
};

export default Sidebar;
