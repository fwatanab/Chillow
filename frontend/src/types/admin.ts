import type { User } from "./user";

export type AdminReport = {
	id: number;
	reporter_id: number;
	reported_user_id: number;
	message_id: number;
	message_content: string;
	message_type: string;
	attachment_url?: string | null;
	attachment_object?: string | null;
	reason: string;
	status: string;
	resolution?: string | null;
	resolution_note?: string | null;
	handled_by?: number | null;
	handled_at?: string | null;
	reporter: User;
	reported_user: User;
};

export type BannedUser = User & {
	is_banned: boolean;
	banned_at?: string | null;
	ban_reason?: string | null;
	ban_expires_at?: string | null;
};
