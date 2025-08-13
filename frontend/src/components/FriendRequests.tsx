import axios from "../utils/axios";
import { useEffect, useState } from "react";
import type { FriendRequest } from "../types/friend";

const FriendRequests = () => {
	const [requests, setRequests] = useState<FriendRequest[]>([]);

	const fetchRequests = async () => {
		const res = await axios.get("/friend-requests");
		setRequests(res.data);
	};

	useEffect(() => {
		fetchRequests();
	}, []);

	const respondToRequest = async (id: number, accepted: boolean) => {
		await axios.post(`/friend-requests/${id}/${accepted ? "accept" : "decline"}`);
		fetchRequests();
	};

    return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">フレンド申請</h3>
      {requests.length === 0 ? (
        <p className="text-sm text-gray-400">申請はありません</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((req) => (
            <li key={req.id} className="flex justify-between items-center bg-gray-800 p-2 rounded">
              <span>{req.requester_nickname}</span>
              <div className="space-x-2">
                <button
                  onClick={() => respondToRequest(req.id, true)}
                  className="px-2 py-1 bg-green-500 rounded text-white"
                >
                  承認
                </button>
                <button
                  onClick={() => respondToRequest(req.id, false)}
                  className="px-2 py-1 bg-red-500 rounded text-white"
                >
                  拒否
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
    );
};

export default FriendRequests;

