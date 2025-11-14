import { useEffect, useRef } from "react";
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

  return (
    <div className="flex flex-col h-full bg-discord-background text-discord-text">
      <header className="p-4 font-bold border-b border-gray-600">
        {friend.friend_nickname}
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg: MessagePayload, idx: number) => (
          <div
            key={idx}
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


// import { useEffect, useRef, useState, useCallback } from "react";
// import { useParams } from "react-router-dom";
// import { useChatSocket } from "../hooks/useChatSocket";
// import { useRecoilState } from "recoil";
// import { chatMessagesState } from "../recoil/chatState";
// import { getMessages } from "../api/chat";
// 
// const ChatRoom = () => {
//   const { id } = useParams();
//   const friendId = Number(id);
//   const { sendMessage } = useChatSocket(friendId);
//   const [messages, setMessages] = useRecoilState(chatMessagesState(friendId));
//   const [input, setInput] = useState("");
// 
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const topObserverRef = useRef<HTMLDivElement>(null);
// 
//   const [hasMore, setHasMore] = useState(true);
//   const [loading, setLoading] = useState(false);
// 
//   console.log("✅ ChatRoom loaded for friendId:", friendId);
// 
//   // ✅ テスト用ダミーデータ：履歴がないときに仮表示
//   // ⚠️ 本番ではこの useEffect 全体を削除してください！
//   useEffect(() => {
//     if (messages.length === 0) {
//       setMessages([
//         {
//           type: "chat",                 // ✅ MessagePayload に必要な型
//           sender_id: friendId,
//           receiver_id: 1,              // ← 仮に自分のIDとする
//           content: "これはテストメッセージです",
//           timestamp: new Date().toISOString(),
//         },
//       ]);
//     }
//   }, [friendId, messages, setMessages]);
// 
//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
//   };
// 
//   // ✅ 初回ロード：履歴取得
//   useEffect(() => {
//     const loadInitialMessages = async () => {
//       try {
//         const data = await getMessages(friendId);
//         if (Array.isArray(data)) {
//           setMessages(data);
//         } else {
//           console.error("❌ Invalid message data (not array):", data);
//         }
//         scrollToBottom();
//       } catch (err) {
//         console.error("❌ 履歴取得失敗", err);
//       }
//     };
//     loadInitialMessages();
//   }, [friendId, setMessages]);
// 
//   // ✅ 無限スクロール（過去メッセージ追加）
//   const loadMoreMessages = useCallback(async () => {
//     if (!hasMore || loading || messages.length === 0) return;
//     setLoading(true);
//     try {
//       const oldest = messages[0].timestamp;
//       const olderMessages = await getMessages(friendId, 30, oldest);
//       if (!Array.isArray(olderMessages) || olderMessages.length === 0) {
//         setHasMore(false);
//       } else {
//         setMessages((prev) => [...olderMessages, ...prev]);
//       }
//     } catch (err) {
//       console.error("❌ 過去メッセージ取得失敗", err);
//     } finally {
//       setLoading(false);
//     }
//   }, [friendId, hasMore, loading, messages, setMessages]);
// 
//   // IntersectionObserver で上部スクロール検出
//   useEffect(() => {
//     const observer = new IntersectionObserver(
//       (entries) => {
//         if (entries[0].isIntersecting) {
//           loadMoreMessages();
//         }
//       },
//       { threshold: 1.0 }
//     );
//     const top = topObserverRef.current;
//     if (top) observer.observe(top);
//     return () => {
//       if (top) observer.unobserve(top);
//     };
//   }, [loadMoreMessages]);
// 
//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (input.trim() === "") return;
//     sendMessage(input);
//     setInput("");
//     setTimeout(scrollToBottom, 100);
//   };
// 
//   return (
//     <div className="flex flex-col h-screen p-4">
//       <header className="text-xl font-bold text-[#7289DA] mb-4">
//         Chat with Friend ID: {friendId}
//       </header>
// 
//       <div className="flex-1 overflow-y-auto space-y-2">
//         <div ref={topObserverRef} />
//         {Array.isArray(messages) &&
//           messages.map((msg, idx) => (
//             <div
//               key={idx}
//               className={`chat-bubble ${
//                 msg.sender_id === friendId ? "chat-bubble-other" : "chat-bubble-self"
//               }`}
//             >
//               <div>{msg.content}</div>
//               <div className="text-xs text-right">
//                 {new Date(msg.timestamp ?? "").toLocaleTimeString()}
//               </div>
//             </div>
//           ))}
//         <div ref={messagesEndRef} />
//       </div>
// 
//       <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
//         <input
//           type="text"
//           className="input"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           placeholder="メッセージを入力..."
//         />
//         <button type="submit" className="btn btn-primary">
//           送信
//         </button>
//       </form>
//     </div>
//   );
// };
// 
// export default ChatRoom;
// 
