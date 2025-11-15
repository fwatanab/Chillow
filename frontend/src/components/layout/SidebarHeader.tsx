type Props = {
	onOpenFriendManage: () => void;
	isMobile?: boolean;
};

const SidebarHeader = ({ onOpenFriendManage }: Props) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-700">
      <h2 className="text-lg font-bold">フレンド</h2>
      <button
        onClick={onOpenFriendManage}
        className="hover:text-discord-accent text-2xl leading-none"
        title="フレンド追加・申請"
      >
        ＋
      </button>
    </div>
  );
};

export default SidebarHeader;
