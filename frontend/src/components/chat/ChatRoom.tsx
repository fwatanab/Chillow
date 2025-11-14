import { useEffect, useRef, type KeyboardEvent } from "react";
import type { MessagePayload } from "../../types/chat";
import type { Friend } from "../../types/friend";
import { useChatSocket } from "../../hooks/useChatSocket";

interface Props {
  friend: Friend;
}

const ChatRoom = ({ friend }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, messages } = useChatSocket(friend.friend_id);
  const isComposing = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const content = inputRef.current?.value.trim();
    if (content) {
      sendMessage(content);
      inputRef.current!.value = "";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (isComposing.current) {
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-discord-background text-discord-text">
      <header className="p-4 border-b border-gray-600 flex items-center gap-4">
        <span className="font-bold">{friend.friend_nickname}</span>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg: MessagePayload, idx: number) => (
          <div
            key={msg.id ?? idx}
            className={`max-w-[70%] p-2 rounded-lg ${msg.isOwn ? "bg-discord-accent ml-auto text-white" : "bg-gray-700"}`}
          >
            {msg.content}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 border-t border-gray-600 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="メッセージを入力..."
          className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white focus:outline-none"
          onCompositionStart={() => {
            isComposing.current = true;
          }}
          onCompositionEnd={() => {
            isComposing.current = false;
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={handleSend}
          className="bg-discord-accent px-4 py-2 rounded-lg text-white hover:opacity-90"
        >
          送信
        </button>
      </div>
    </div>
  );
};

export default ChatRoom;
