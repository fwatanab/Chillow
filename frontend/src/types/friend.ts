export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export type Friend = {
	id: number;
	user_id: number;
	friend_id: number;
	user_nickname: string;
	created_at: string;
};

export type FriendRequest = {
	id: number;
	sender_id: number;
	receiver_id: number;
	sender_nickname: string;
	status: "pending" | "accepted" | "declined";
	created_at: string;
	updated_at: string;
};

