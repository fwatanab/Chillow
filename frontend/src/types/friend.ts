export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export type Friend = {
	id: number;
	user_id: number;
	friend_id: number;
	friend_nickname: string;
	friend_avatar_url: string | null;
	created_at: string;
	updated_at: string;
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

