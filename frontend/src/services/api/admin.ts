import axios from "../../utils/axios";
import type { AdminReport, BannedUser } from "../../types/admin";

export const fetchReports = async (status: "pending" | "all" = "pending"): Promise<AdminReport[]> => {
	const res = await axios.get("/admin/reports", { params: { status } });
	return res.data ?? [];
};

export const resolveReport = async (
	reportId: number,
	payload: { action: "ban" | "reject"; note?: string; ban_reason?: string; duration_hours?: number | null },
): Promise<AdminReport> => {
	const res = await axios.post(`/admin/reports/${reportId}/resolve`, payload);
	return res.data;
};

export const fetchBannedUsers = async (): Promise<BannedUser[]> => {
	const res = await axios.get("/admin/banned-users");
	return res.data ?? [];
};

export const banUser = async (userId: number, reason: string, durationHours?: number | null): Promise<void> => {
	await axios.post(`/admin/users/${userId}/ban`, { reason, duration_hours: durationHours });
};

export const unbanUser = async (userId: number): Promise<void> => {
	await axios.post(`/admin/users/${userId}/unban`);
};
