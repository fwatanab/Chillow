export type PickerMode = "emoji" | "sticker";

export type EmojiPreset = {
	id: string;
	label: string;
	type: "unicode" | "image";
	value: string; // Unicode glyph or画像のパス
};

export type StickerPreset = {
	id: string;
	label: string;
	asset: string; // 画像ファイルのパス
};

export const EMOJI_PRESETS: EmojiPreset[] = [
	{ id: "emoji-smile", label: "スマイル", type: "unicode", value: "😀" },
	{ id: "emoji-laugh", label: "笑い", type: "unicode", value: "😂" },
	{ id: "emoji-love", label: "ハート", type: "unicode", value: "😍" },
	{ id: "emoji-thinking", label: "考え中", type: "unicode", value: "🤔" },
	{ id: "emoji-cry", label: "涙", type: "unicode", value: "😢" },
	{ id: "emoji-clap", label: "拍手", type: "unicode", value: "👏" },
	{ id: "emoji-thumb", label: "いいね", type: "unicode", value: "👍" },
	{ id: "emoji-celebrate", label: "お祝い", type: "unicode", value: "🙌" },
];

export const STICKER_PRESETS: StickerPreset[] = [
	{ id: "sticker-smile", label: "スマイル", asset: "/stickers/business_man_smile.png" },
	{ id: "sticker-laugh", label: "笑い", asset: "/stickers/business_man_laugh.png" },
	{ id: "sticker-idea", label: "ひらめき", asset: "/stickers/business_man_idea.png" },
	{ id: "sticker-angry", label: "怒り", asset: "/stickers/business_man_angry.png" },
	{ id: "sticker-cry", label: "涙", asset: "/stickers/business_man_cry.png" },
	{ id: "sticker-surprise", label: "驚き", asset: "/stickers/business_man_surprise.png" },
	{ id: "sticker-think", label: "考える", asset: "/stickers/business_man_think.png" },
	{ id: "sticker-question", label: "疑問", asset: "/stickers/business_man_question.png" },
	{ id: "sticker-heat", label: "ハート", asset: "/stickers/business_man_heat.png" },
	{ id: "sticker-sleep", label: "眠い", asset: "/stickers/business_man_sleep.png" },
	{ id: "sticker-tehe", label: "てへ", asset: "/stickers/business_man_tehe.png" },
	{ id: "sticker-niyari", label: "にやり", asset: "/stickers/business_man_niyari.png" },
	{ id: "sticker-kangaechu", label: "考え中", asset: "/stickers/business_man_kangaechu.png" },
];
