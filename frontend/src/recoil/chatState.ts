// import { atomFamily, atom, RecoilValueReadOnly } from "recoil";
import { atomFamily, atom } from "recoil";
import type { MessagePayload } from "../types/chat";

export const chatMessagesState = atomFamily<MessagePayload[], number>({
	key: "chatMessagesState",
	default: [],
});

export const currentChatFriendState = atom<number | null>({
	key: "currentChatFriendState",
	default: null,
});
