export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export type Friend = {
	id: number;
	user_id: number;
	friend_id: number;
	friend_nickname: string;
	friend_avatar_url: string | null;
	created_at: string;
	updated_at: string;
	last_message_id?: number | null;
	last_message_content?: string | null;
	last_message_type?: string | null;
	last_message_attachment_url?: string | null;
	last_message_at?: string | null;
	last_message_edited_at?: string | null;
	last_message_is_deleted?: boolean | null;
	last_message_is_own?: boolean | null;
	last_message_sender_id?: number | null;
	unread_count?: number;
	is_online?: boolean;
};

export type FriendRequest = {
	id: number;
	requester_id: number;
	receiver_id: number;
	requester_nickname: string;
	status: FriendRequestStatus;
	created_at: string;
	updated_at: string;
};
