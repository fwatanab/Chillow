type Props = {
  onToggleFriendRequests: () => void;
};

const SidebarHeader = ({ onToggleFriendRequests }: Props) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-700">
      <h2 className="text-lg font-bold">フレンド</h2>
      <button
        onClick={onToggleFriendRequests}
        className="hover:text-discord-accent"
        title="フレンド申請"
      >
        ➕
      </button>
    </div>
  );
};

export default SidebarHeader;

