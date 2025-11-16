import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ChangeEvent } from "react";
import type { MessagePayload } from "../../types/chat";
import type { Friend } from "../../types/friend";
import { useChatSocket } from "../../hooks/useChatSocket";
import { uploadMessageAttachment, reportMessage } from "../../services/api/chat";
import { EMOJI_PRESETS, STICKER_PRESETS, type PickerMode, type EmojiPreset, type StickerPreset } from "../../constants/chatPalette";
import { useIsMobile } from "../../hooks/useIsMobile";

interface Props {
	friend: Friend;
	showHeader?: boolean;
}

const emojiOnlyRegex = /^\p{Extended_Pictographic}+$/u;
const isEmojiOnly = (text: string) => {
	const trimmed = text.trim();
	return trimmed.length > 0 && emojiOnlyRegex.test(trimmed);
};

const formatTimestamp = (value: string) => {
	const date = new Date(value);
	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDateLabel = (value: string) => {
	const date = new Date(value);
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	return `${month}/${day}`;
};

const ChatRoom = ({ friend, showHeader = true }: Props) => {
	const chatEndRef = useRef<HTMLDivElement>(null);
	const messageListRef = useRef<HTMLDivElement>(null);
	const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
	const photoInputRef = useRef<HTMLInputElement>(null);
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
	const [pickerOpen, setPickerOpen] = useState(false);
	const [uploadPickerOpen, setUploadPickerOpen] = useState(false);
	const [pickerMode, setPickerMode] = useState<PickerMode>("emoji");
	const [lastPickerMode, setLastPickerMode] = useState<PickerMode>("emoji");
	const [uploading, setUploading] = useState(false);
	const [showScrollButton, setShowScrollButton] = useState(false);
	const [shouldStickToBottom, setShouldStickToBottom] = useState(true);
	const typingIndicator = useMemo(() => (isFriendTyping ? `${friend.friend_nickname} が入力中...` : null), [friend.friend_nickname, isFriendTyping]);
	const friendOnlineState = isFriendOnline || Boolean(friend.is_online);
	const isMobile = useIsMobile();
	const initialScrollDone = useRef(false);
	const initialUnreadCountRef = useRef(friend.unread_count ?? 0);

	const scrollToBottom = useCallback(
		(behavior: ScrollBehavior = "smooth") => {
			chatEndRef.current?.scrollIntoView({ behavior, block: "end" });
		},
		[]
	);

	const scrollToMessage = useCallback((messageId: number, behavior: ScrollBehavior = "auto") => {
		const target = messageRefs.current.get(messageId);
		if (target) {
			target.scrollIntoView({ behavior, block: "start", inline: "nearest" });
		}
	}, []);

	useEffect(() => {
		initialScrollDone.current = false;
		initialUnreadCountRef.current = friend.unread_count ?? 0;
	}, [friend.friend_id, friend.unread_count]);

	useEffect(() => {
		if (!messages.length || initialScrollDone.current) return;
		const unreadCount = initialUnreadCountRef.current ?? 0;
		if (unreadCount > 0 && unreadCount <= messages.length) {
			const targetIndex = Math.max(messages.length - unreadCount, 0);
			const targetMessage = messages[targetIndex];
			if (targetMessage?.id) {
				scrollToMessage(targetMessage.id, "auto");
				setShouldStickToBottom(false);
				setShowScrollButton(true);
				initialScrollDone.current = true;
				return;
			}
		}
		scrollToBottom("auto");
		initialScrollDone.current = true;
	}, [messages, scrollToBottom, scrollToMessage]);

	useEffect(() => {
		if (!messages.length || !initialScrollDone.current) return;
		const lastMessage = messages[messages.length - 1];
		if (shouldStickToBottom || lastMessage?.isOwn) {
			scrollToBottom(lastMessage?.isOwn ? "smooth" : "auto");
		}
	}, [messages, scrollToBottom, shouldStickToBottom]);

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
		setUploadPickerOpen(false);
	};

	const handleStickerSelect = (sticker: StickerPreset) => {
		sendMessage(sticker.asset, { messageType: "sticker" });
		setPickerOpen(false);
		setPickerMode("sticker");
		setLastPickerMode("sticker");
	};

	const handleEmojiSelect = (emoji: EmojiPreset) => {
		if (emoji.type === "unicode") {
			setMessageText((prev) => prev + emoji.value);
		} else {
			setMessageText((prev) => `${prev}[emoji:${emoji.id}]`);
		}
		setPickerMode("emoji");
		setLastPickerMode("emoji");
	};

	const togglePicker = () => {
		setPickerOpen((prev) => {
			if (!prev) {
				setPickerMode(lastPickerMode);
			}
			return !prev;
		});
	};

	const changePickerMode = (mode: PickerMode) => {
		setPickerMode(mode);
		setLastPickerMode(mode);
	};

	const toggleUploadPicker = (e?: React.MouseEvent) => {
		e?.stopPropagation();
		if (!isMobile) {
			triggerFileSelect();
			return;
		}
		setUploadPickerOpen((prev) => !prev);
		setPickerOpen(false);
	};

	const triggerPhotoSelect = (e?: React.MouseEvent) => {
		e?.stopPropagation();
		setUploadPickerOpen(false);
		photoInputRef.current?.click();
	};

	const triggerFileSelect = (e?: React.MouseEvent) => {
		e?.stopPropagation();
		setUploadPickerOpen(false);
		fileInputRef.current?.click();
	};

	const [activeMessageId, setActiveMessageId] = useState<number | null>(null);

	const handleMessageClick = (message: MessagePayload) => {
		setActiveMessageId((prev) => (prev === message.id ? null : message.id ?? null));
		setPickerOpen(false);
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

	const handleWorkspaceClick = () => {
		setActiveMessageId(null);
		setPickerOpen(false);
		setUploadPickerOpen(false);
	};

	const handleScroll = () => {
		const container = messageListRef.current;
		if (!container) return;
		const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
		const isNearBottom = distanceFromBottom < 80;
		setShouldStickToBottom(isNearBottom);
		setShowScrollButton(!isNearBottom);
	};

	return (
		<div className="flex flex-col h-full bg-discord-background text-discord-text" onClick={handleWorkspaceClick}>
			{showHeader && (
				<header className="p-4 border-b border-gray-800 bg-[#292b31] flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="relative">
							{friend.friend_avatar_url ? (
								<img src={friend.friend_avatar_url} alt={friend.friend_nickname} className="w-10 h-10 rounded-full object-cover" />
							) : (
								<div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white text-lg">
									{friend.friend_nickname?.[0]?.toUpperCase() ?? "?"}
								</div>
							)}
							{friendOnlineState && (
								<span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-discord-background" />
							)}
						</div>
						<div>
							<p className="text-lg font-semibold">{friend.friend_nickname}</p>
							<p className="text-sm text-gray-400">{typingIndicator ?? ""}</p>
						</div>
					</div>
				</header>
			)}
			<div className="relative flex-1 min-h-0">
				<div ref={messageListRef} className="h-full overflow-y-auto p-4 space-y-4" onScroll={handleScroll}>
				{messages.map((msg: MessagePayload, idx: number) => {
					const prevMessage = idx > 0 ? messages[idx - 1] : null;
					const showDateLabel = !prevMessage || formatDateLabel(prevMessage.created_at) !== formatDateLabel(msg.created_at);
					const isOwn = msg.isOwn;
					const alignment = isOwn ? "justify-end" : "justify-start";
					const meta = (
						<div
							className={`flex flex-col text-[10px] text-gray-400 leading-tight ${
								isOwn ? "items-end" : "items-start"
							} min-w-[42px]`}
						>
							{isOwn && msg.is_read && !msg.is_deleted && <span>既読</span>}
							<span>{formatTimestamp(msg.created_at)}</span>
						</div>
					);
					return (
						<div
							key={msg.id ?? idx}
							className="flex flex-col gap-1"
							ref={(el) => {
								if (!msg.id) return;
								if (el) {
									messageRefs.current.set(msg.id, el);
								} else {
									messageRefs.current.delete(msg.id);
								}
							}}
						>
							{showDateLabel && (
								<div className="flex items-center gap-3 px-6">
									<div className="flex-1 h-px bg-gray-700" />
									<span className="text-xs text-gray-300 bg-gray-800/70 px-6 py-1 rounded-full shadow">
										{formatDateLabel(msg.created_at)}
									</span>
									<div className="flex-1 h-px bg-gray-700" />
								</div>
							)}
							<div className={`flex items-end gap-2 ${alignment}`}>
								{isOwn && meta}
								<div
									className={`relative max-w-[75%] ${
										msg.message_type === "sticker" && typeof msg.content === "string" && (msg.content.startsWith("/") || msg.content.startsWith("http"))
											? ""
											: `rounded-2xl px-4 py-2 ${isOwn ? "bg-discord-accent text-white" : "bg-gray-700"}`
									}`}
									role="button"
									tabIndex={0}
									onClick={(e) => {
										e.stopPropagation();
										handleMessageClick(msg);
									}}
								>
								{activeMessageId === msg.id && !msg.is_deleted && (
									<div
										className={`absolute -top-10 ${
											isOwn ? "right-0" : "left-0"
										} flex gap-2 bg-gray-900/90 px-3 py-1 rounded-lg shadow text-xs`}
									>
										{isOwn ? (
											<>
												{msg.message_type === "text" && !isEmojiOnly(msg.content) && (
													<button type="button" className="text-white/80 hover:text-white" onClick={() => startEditing(msg)}>
														編集
													</button>
												)}
												<button type="button" className="text-white/80 hover:text-red-200" onClick={() => confirmDelete(msg)}>
													削除
												</button>
											</>
										) : (
											<button type="button" className="text-white/80 hover:text-red-200" onClick={() => handleReportMessage(msg)}>
												通報
											</button>
										)}
									</div>
								)}
								{msg.is_deleted ? (
									<p className="italic text-sm text-gray-300">このメッセージは削除されました</p>
								) : msg.message_type === "image" && msg.attachment_url ? (
									<img src={msg.attachment_url} alt="upload" className="rounded-lg max-h-64 object-cover" />
								) : msg.message_type === "sticker" ? (
									typeof msg.content === "string" && (msg.content.startsWith("/") || msg.content.startsWith("http")) ? (
										<img src={msg.content} alt="sticker" className="w-[220px] h-[220px] object-contain" />
									) : (
										<span className="text-4xl leading-none">{msg.content}</span>
									)
								) : (
									<p className="whitespace-pre-line break-words">{msg.content}</p>
								)}
							</div>
								{!isOwn && meta}
							</div>
							{msg.edited_at && !msg.is_deleted && <span className={`text-[10px] text-gray-500 ${isOwn ? "text-right" : "text-left"}`}>編集済み</span>}
						</div>
					);
				})}
				<div ref={chatEndRef} />
			</div>
				{showScrollButton && (
					<button
						type="button"
						className="absolute right-4 bottom-4 rounded-full bg-discord-accent/90 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-discord-accent"
						onClick={(e) => {
							e.stopPropagation();
							scrollToBottom();
							setShouldStickToBottom(true);
							setShowScrollButton(false);
						}}
					>
						↓ 最新へ
					</button>
				)}
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
			<div className="p-4 border-t border-gray-800 bg-[#292b31] flex flex-col gap-2">
				<div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
					<div className="relative">
						<button type="button" className="px-3 py-2 bg-gray-700 rounded text-sm" onClick={toggleUploadPicker}>
							＋
						</button>
						{uploadPickerOpen && (
							<div className="absolute bottom-full mb-2 left-0 bg-gray-900/95 rounded-lg shadow text-sm flex flex-col min-w-[120px] p-2 z-20">
								<button type="button" className="px-2 py-1 rounded hover:bg-gray-800 text-left" onClick={triggerPhotoSelect}>
									写真
								</button>
								<button type="button" className="px-2 py-1 rounded hover:bg-gray-800 text-left" onClick={triggerFileSelect}>
									ファイル
								</button>
							</div>
						)}
					</div>
					<div className="flex-1 flex items-center bg-gray-700 rounded">
					<input
						type="text"
						value={messageText}
						placeholder="メッセージを入力..."
						className="flex-1 px-4 py-2 bg-transparent text-white focus:outline-none"
						onChange={handleMessageChange}
						onKeyDown={handleKeyDown}
						onCompositionStart={() => {
							isComposing.current = true;
						}}
						onCompositionEnd={() => {
							isComposing.current = false;
						}}
						onFocus={() => setPickerOpen(false)}
						onBlur={() => {
							if (typingActiveRef.current) {
								typingActiveRef.current = false;
								notifyTypingStop();
							}
						}}
					/>
					<button
						type="button"
						className={`px-3 py-2 text-sm rounded-r ${pickerOpen ? "bg-discord-accent text-white" : "bg-gray-600 text-white"}`}
						onClick={(e) => {
							e.stopPropagation();
							togglePicker();
						}}
					>
						S
					</button>
					</div>
					<button
						type="button"
						className="px-4 py-2 bg-discord-accent text-white rounded disabled:opacity-50"
						onClick={(e) => {
							e.stopPropagation();
							handleSend();
						}}
						disabled={!messageText.trim() && !editingMessage}
					>
						{editingMessage ? "更新" : "送信"}
					</button>
				</div>
			{pickerOpen && (
				<div
					className="bg-gray-800 rounded-lg p-3 flex flex-col gap-3"
					onClick={(e) => {
						e.stopPropagation();
					}}
				>
					<div className="flex gap-2">
						<button
							type="button"
							className={`px-3 py-1 rounded text-sm ${pickerMode === "emoji" ? "bg-discord-accent text-white" : "bg-gray-700"}`}
							onClick={() => changePickerMode("emoji")}
						>
							絵文字
						</button>
						<button
							type="button"
							className={`px-3 py-1 rounded text-sm ${pickerMode === "sticker" ? "bg-discord-accent text-white" : "bg-gray-700"}`}
							onClick={() => changePickerMode("sticker")}
						>
							スタンプ
						</button>
					</div>
					<div
						className="flex flex-wrap gap-3 max-h-40 overflow-y-auto"
						onClick={(e) => {
							e.stopPropagation();
						}}
					>
						{pickerMode === "emoji"
							? EMOJI_PRESETS.map((emoji) => (
									<button key={emoji.id} type="button" className="text-xl" onClick={() => handleEmojiSelect(emoji)}>
										{emoji.type === "unicode" ? emoji.value : <img src={emoji.value} alt={emoji.label} className="w-7 h-7" />}
									</button>
							  ))
							: STICKER_PRESETS.map((sticker) => (
									<button key={sticker.id} type="button" className="text-2xl" onClick={() => handleStickerSelect(sticker)}>
										{/\.(png|webp|svg|gif)$/i.test(sticker.asset) ? (
											<img src={sticker.asset} alt={sticker.label} className="w-12 h-12" />
										) : (
											sticker.asset
										)}
									</button>
							  ))}
					</div>
				</div>
			)}
			</div>
			<input type="file" accept="image/*" ref={photoInputRef} className="hidden" onChange={handleFileChange} />
			<input type="file" accept="*/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
		</div>
	);
};

export default ChatRoom;
