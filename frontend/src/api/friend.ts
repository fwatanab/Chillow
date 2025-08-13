import axios from "../utils/axios";
import type { Friend, FriendRequest, FriendRequestStatus } from "../types/friend";

// フレンド申請を送信
export const sendFriendRequest = async (receiverId: number): Promise<FriendRequest> => {
  const res = await axios.post("/friend-requests", {
    receiver_id: receiverId,
  });
  return res.data;
};

// 自分へのフレンド申請一覧を取得
export const getFriendRequests = async (): Promise<FriendRequest[]> => {
  const res = await axios.get("/friend-requests");
  return res.data;
};

// フレンド申請に応答（承認または拒否）
export const respondToFriendRequest = async (
  requestId: number,
  status: FriendRequestStatus
): Promise<FriendRequest> => {
  const res = await axios.patch(`/friend-requests/${requestId}`, { status });
  return res.data;
};

// 現在のフレンド一覧を取得
export const getFriends = async (): Promise<Friend[]> => {
  const res = await axios.get("/friends");
  return res.data;
};

// フレンドを削除
export const deleteFriend = async (friendId: number): Promise<void> => {
  await axios.delete(`/friends/${friendId}`);
};


