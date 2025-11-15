export type User = {
	id: number;
	nickname: string;
	email: string;
	friend_code: string;
	avatar_url: string | null;
	role: string;
	is_banned?: boolean;
	ban_reason?: string | null;
	ban_expires_at?: string | null;
};
