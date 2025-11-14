import { useNavigate } from "react-router-dom";
import type { User } from "../../types/user";

type Props = {
  currentUser: User | null;
};

const SidebarFooter = ({ currentUser }: Props) => {
  const navigate = useNavigate();

  return (
    <div
      className="p-4 border-t border-gray-700 cursor-pointer hover:bg-discord-accent/10"
      onClick={() => navigate("/mypage")}
    >
      <p className="text-sm font-semibold">{currentUser?.nickname ?? "未ログイン"}</p>
    </div>
  );
};

export default SidebarFooter;

