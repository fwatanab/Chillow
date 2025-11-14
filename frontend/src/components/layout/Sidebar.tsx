import SidebarHeader from "./SidebarHeader";
import FriendList from "../friends/FriendList";
import AddFriend from "../friends/AddFriend";
import FriendRequests from "../friends/FriendRequests";
import SidebarFooter from "./SidebarFooter";
import type { Friend } from "../../types/friend";
import type { User } from "../../types/user";

type Props = {
	currentUser: User | null;
	onSelectFriend: (friend: Friend) => void;
	showFriendRequests: boolean;
	onToggleFriendRequests: () => void;
};

const Sidebar = ({
	currentUser,
	onSelectFriend,
	showFriendRequests,
	onToggleFriendRequests,
	}: Props) => {
	return (
		<aside className="w-72 bg-discord-sidebar flex flex-col">
			<SidebarHeader onToggleFriendRequests={onToggleFriendRequests} />
			<div className="flex-1 overflow-y-auto">
				<FriendList onSelectFriend={onSelectFriend} />
				<AddFriend />
				{showFriendRequests && <FriendRequests />}
			</div>
			<SidebarFooter currentUser={currentUser} />
		</aside>
	);
};

export default Sidebar;
