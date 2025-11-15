import { useNavigate } from "react-router-dom";
import type { User } from "../../types/user";

type Props = {
  currentUser: User | null;
};

const SidebarFooter = ({ currentUser }: Props) => {
	const navigate = useNavigate();
	const avatar = currentUser?.avatar_url ?? "";
	const initial = currentUser?.nickname?.[0]?.toUpperCase() ?? "?";

	return (
		<button
			type="button"
			className="w-full p-4 border-t border-gray-700 flex items-center gap-3 hover:bg-discord-accent/10 transition text-left"
			onClick={() => navigate("/mypage")}
		>
			{avatar ? (
				<img src={avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
			) : (
				<div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm">{initial}</div>
			)}
			<div className="flex flex-col">
				<span className="text-sm font-semibold">{currentUser?.nickname ?? "未ログイン"}</span>
				{currentUser?.email && <span className="text-xs text-gray-400">{currentUser.email}</span>}
			</div>
		</button>
	);
};

export default SidebarFooter;
