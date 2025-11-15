import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ChangeEvent } from "react";
import type { MessagePayload } from "../../types/chat";
import type { Friend } from "../../types/friend";
import { useChatSocket } from "../../hooks/useChatSocket";
import { uploadMessageAttachment, reportMessage } from "../../services/api/chat";

interface Props {
	friend: Friend;
}

const STICKERS = ["🎉", "😊", "👏", "🔥", "😎", "❤️", "🥳", "👍"];
const QUICK_EMOJIS = ["😀", "😂", "😍", "🤔", "😢", "👏", "👍", "🙌"];
const emojiOnlyRegex = /^\p{Extended_Pictographic}+$/u;
const isEmojiOnly = (text: string) => {
	const trimmed = text.trim();
	return trimmed.length > 0 && emojiOnlyRegex.test(trimmed);
};

const formatTimestamp = (value: string) => {
	const date = new Date(value);
	const now = new Date();
	const sameDay =
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth() &&
		date.getDate() === now.getDate();
	return sameDay
		? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
		: `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date
				.getMinutes()
				.toString()
				.padStart(2, "0")}`;
};

const ChatRoom = ({ friend }: Props) => {
	const chatEndRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const isComposing = useRef(false);
	const typingPulseRef = useRef<number | null>(null);
	const typingActiveRef = useRef(false);
	const {
		messages,
		sendMessage,
		editMessage,
		deleteMessage,
		notifyTypingStart,
		notifyTypingStop,
		isFriendTyping,
		isFriendOnline,
	} = useChatSocket(friend.friend_id);
	const [messageText, setMessageText] = useState("");
	const [editingMessage, setEditingMessage] = useState<MessagePayload | null>(null);
	const [showStickerPicker, setShowStickerPicker] = useState(false);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [uploading, setUploading] = useState(false);
	const typingIndicator = useMemo(() => (isFriendTyping ? `${friend.friend_nickname} が入力中...` : null), [friend.friend_nickname, isFriendTyping]);
	const friendOnlineState = isFriendOnline || Boolean(friend.is_online);

	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	useEffect(() => () => {
		if (typingPulseRef.current) {
			window.clearTimeout(typingPulseRef.current);
		}
		if (typingActiveRef.current) {
			notifyTypingStop();
		}
	}, [notifyTypingStop]);

	const resetTypingPulse = () => {
		if (typingPulseRef.current) {
			window.clearTimeout(typingPulseRef.current);
		}
		typingPulseRef.current = window.setTimeout(() => {
			if (typingActiveRef.current) {
				typingActiveRef.current = false;
				notifyTypingStop();
			}
			typingPulseRef.current = null;
		}, 2500);
	};

	const handleMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
		setMessageText(e.target.value);
		if (!typingActiveRef.current) {
			notifyTypingStart();
			typingActiveRef.current = true;
		}
		resetTypingPulse();
	};

	const handleSend = () => {
		if (editingMessage) {
			if (!editingMessage.content || isEmojiOnly(editingMessage.content)) {
				return;
			}
			editMessage(editingMessage.id, messageText);
			setEditingMessage(null);
			setMessageText("");
		} else {
			const trimmed = messageText.trim();
			if (!trimmed) return;
			const emojiOnly = isEmojiOnly(trimmed);
			sendMessage(trimmed, { messageType: emojiOnly ? "sticker" : "text" });
			setMessageText("");
		}
		if (typingActiveRef.current) {
			typingActiveRef.current = false;
			notifyTypingStop();
		}
		if (typingPulseRef.current) {
			window.clearTimeout(typingPulseRef.current);
			typingPulseRef.current = null;
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (isComposing.current) return;
		if (e.key === "Enter") {
			e.preventDefault();
			handleSend();
		}
	};

	const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploading(true);
		try {
			const resp = await uploadMessageAttachment(file);
			sendMessage("", { messageType: "image", attachmentUrl: resp.url, attachmentObject: resp.objectKey ?? null });
		} catch (error) {
			console.error("❌ ファイル送信に失敗", error);
		} finally {
			setUploading(false);
			e.target.value = "";
		}
	};

	const handleStickerSelect = (sticker: string) => {
		sendMessage(sticker, { messageType: "sticker" });
		setShowStickerPicker(false);
	};

	const handleEmojiSelect = (emoji: string) => {
		setMessageText((prev) => prev + emoji);
	};

	const startEditing = (message: MessagePayload) => {
		if (message.message_type !== "text" || isEmojiOnly(message.content)) {
			return;
		}
		setEditingMessage(message);
		setMessageText(message.content);
	};

	const cancelEditing = () => {
		setEditingMessage(null);
		setMessageText("");
	};

	const confirmDelete = (message: MessagePayload) => {
		if (window.confirm("このメッセージを削除しますか？")) {
			deleteMessage(message.id);
		}
	};

	const handleReportMessage = async (message: MessagePayload) => {
		if (!message.id) return;
		const reason = window.prompt("通報理由を入力してください");
		if (!reason) return;
		try {
			await reportMessage(message.id, reason);
			alert("通報しました。対応までしばらくお待ちください。");
		} catch (err) {
			console.error("❌ 通報に失敗", err);
			alert("通報に失敗しました");
		}
	};

	return (
		<div className="flex flex-col h-full bg-discord-background text-discord-text">
			<header className="p-4 border-b border-gray-700 flex items-center justify-between">
				<div>
					<p className="text-lg font-semibold">{friend.friend_nickname}</p>
					<p className="text-sm text-gray-400">
						{friendOnlineState ? "オンライン" : "オフライン"}
						{typingIndicator ? ` ・ ${typingIndicator}` : ""}
					</p>
				</div>
			</header>
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{messages.map((msg: MessagePayload, idx: number) => {
					const alignment = msg.isOwn ? "items-end" : "items-start";
					return (
						<div key={msg.id ?? idx} className={`flex flex-col ${alignment} group`}>
							<div
								className={`relative max-w-[75%] rounded-2xl px-4 py-2 ${
									msg.isOwn ? "bg-discord-accent text-white" : "bg-gray-700"
								}`}
							>
							{msg.isOwn && !msg.is_deleted && (
								<div className="absolute -top-3 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition">
									{msg.message_type === "text" && !isEmojiOnly(msg.content) && (
										<button
											type="button"
											className="text-xs text-white/80 hover:text-white"
											onClick={() => startEditing(msg)}
										>
											編集
										</button>
									)}
									<button
										type="button"
										className="text-xs text-white/80 hover:text-red-200"
										onClick={() => confirmDelete(msg)}
									>
										削除
									</button>
								</div>
							)}
							{!msg.isOwn && !msg.is_deleted && (
								<div className="absolute -top-3 left-0 flex gap-1 opacity-0 group-hover:opacity-100 transition">
									<button
										type="button"
										className="text-xs text-white/80 hover:text-red-200"
										onClick={() => handleReportMessage(msg)}
									>
										通報
									</button>
								</div>
							)}
								{msg.is_deleted ? (
									<p className="italic text-sm text-gray-300">このメッセージは削除されました</p>
								) : msg.message_type === "image" && msg.attachment_url ? (
									<img
										src={msg.attachment_url}
										alt="upload"
										className="rounded-lg max-h-64 object-cover"
									/>
								) : msg.message_type === "sticker" ? (
									<span className="text-4xl leading-none">{msg.content}</span>
								) : (
									<p className="whitespace-pre-line break-words">{msg.content}</p>
								)}
								<div className="mt-1 flex items-center justify-end gap-2 text-xs text-gray-200">
									<span>{formatTimestamp(msg.created_at)}</span>
									{msg.edited_at && !msg.is_deleted && <span>編集済み</span>}
									{msg.isOwn && <span>{msg.is_read ? "既読" : "送信済み"}</span>}
								</div>
							</div>
						</div>
					);
				})}
				<div ref={chatEndRef} />
			</div>
			{typingIndicator && <div className="px-4 text-xs text-gray-400">{typingIndicator}</div>}
			{uploading && <div className="px-4 text-xs text-gray-400">画像をアップロード中...</div>}
			{editingMessage && (
				<div className="px-4 text-sm text-yellow-300 flex items-center gap-2">
					<span>編集中</span>
					<button type="button" className="underline" onClick={cancelEditing}>
						キャンセル
					</button>
				</div>
			)}
			<div className="p-4 border-t border-gray-700 flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<button type="button" className="px-3 py-2 bg-gray-700 rounded text-sm" onClick={() => fileInputRef.current?.click()}>
					画像
				</button>
				<button
					type="button"
					className={`px-3 py-2 rounded text-sm ${showStickerPicker ? "bg-discord-accent" : "bg-gray-700"}`}
					onClick={() => {
						setShowStickerPicker((prev) => !prev);
						setShowEmojiPicker(false);
					}}
				>
					スタンプ
				</button>
				<button
					type="button"
					className={`px-3 py-2 rounded text-sm ${showEmojiPicker ? "bg-discord-accent" : "bg-gray-700"}`}
					onClick={() => {
						setShowEmojiPicker((prev) => !prev);
						setShowStickerPicker(false);
					}}
				>
					絵文字
				</button>
			</div>
				<div className="flex gap-2">
					<input
						type="text"
						value={messageText}
						placeholder="メッセージを入力..."
						className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white focus:outline-none"
						onChange={handleMessageChange}
						onKeyDown={handleKeyDown}
						onCompositionStart={() => {
							isComposing.current = true;
						}}
						onCompositionEnd={() => {
							isComposing.current = false;
						}}
						onBlur={() => {
							if (typingActiveRef.current) {
								typingActiveRef.current = false;
								notifyTypingStop();
							}
						}}
					/>
					<button
						onClick={handleSend}
						className="bg-discord-accent px-4 py-2 rounded-lg text-white hover:opacity-90"
					>
						{editingMessage ? "更新" : "送信"}
					</button>
				</div>
			{showStickerPicker && (
				<div className="bg-gray-800 rounded-lg p-3 flex flex-wrap gap-3">
					{STICKERS.map((sticker) => (
						<button key={sticker} type="button" className="text-2xl" onClick={() => handleStickerSelect(sticker)}>
							{sticker}
						</button>
					))}
				</div>
			)}
			{showEmojiPicker && (
				<div className="bg-gray-800 rounded-lg p-3 flex flex-wrap gap-3">
					{QUICK_EMOJIS.map((emoji) => (
						<button key={emoji} type="button" className="text-xl" onClick={() => handleEmojiSelect(emoji)}>
							{emoji}
						</button>
					))}
				</div>
			)}
			</div>
			<input
				type="file"
				accept="image/*"
				ref={fileInputRef}
				className="hidden"
				onChange={handleFileChange}
			/>
		</div>
	);
};

export default ChatRoom;
