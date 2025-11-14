import axios from "../../utils/axios";
import type { User } from "../../types/user";

export const fetchCurrentUser = async (): Promise<User> => {
	const res = await axios.get("/users/me");
	return res.data;
};

export const searchUserByCode = async (code: string): Promise<User | null> => {
	const res = await axios.get("/users/search", {
		params: { code },
	});
	return res.data ?? null;
};
