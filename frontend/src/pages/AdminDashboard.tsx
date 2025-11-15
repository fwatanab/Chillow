import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { authLoadingState, currentUserState } from "../store/auth";
import type { AdminReport, BannedUser } from "../types/admin";
import { fetchReports, resolveReport, fetchBannedUsers, unbanUser } from "../services/api/admin";
import { logout } from "../services/api/auth";
import { clearStoredUser } from "../utils/authStorage";

const AdminDashboard = () => {
	const currentUser = useRecoilValue(currentUserState);
	const setUser = useSetRecoilState(currentUserState);
	const setAuthLoading = useSetRecoilState(authLoadingState);
	const [reports, setReports] = useState<AdminReport[]>([]);
	const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
	const [loading, setViewLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [resolvingId, setResolvingId] = useState<number | null>(null);
	const [refreshKey, setRefreshKey] = useState(0);
	const navigate = useNavigate();

	const loadData = async () => {
		try {
			setError(null);
			setViewLoading(true);
			const [reportsRes, bansRes] = await Promise.all([fetchReports("pending"), fetchBannedUsers()]);
			setReports(reportsRes);
			setBannedUsers(bansRes);
		} catch (err) {
			console.error("❌ 管理データの取得に失敗", err);
			setError("データの取得に失敗しました");
		} finally {
			setViewLoading(false);
		}
	};

	useEffect(() => {
		loadData();
	}, [refreshKey]);

	const handleRefresh = () => setRefreshKey((k) => k + 1);

	const handleResolve = async (report: AdminReport, action: "ban" | "reject") => {
		try {
			setResolvingId(report.id);
			if (action === "ban") {
				const banReason = window.prompt("BAN理由を入力してください", `通報理由: ${report.reason}`);
				if (!banReason) return;
				const durationInput = window.prompt("BAN期間を時間で指定（空欄で無期限）");
				const duration = durationInput ? Number(durationInput) : null;
				await resolveReport(report.id, { action: "ban", ban_reason: banReason, duration_hours: duration ?? undefined });
			} else {
				const note = window.prompt("拒否理由（任意）") ?? "";
				await resolveReport(report.id, { action: "reject", note });
			}
			handleRefresh();
		} catch (err) {
			console.error("❌ レポート処理に失敗", err);
			alert("処理に失敗しました");
		} finally {
			setResolvingId(null);
		}
	};

	const handleUnban = async (userId: number) => {
		if (!window.confirm("BANを解除しますか？")) return;
		try {
			await unbanUser(userId);
			handleRefresh();
		} catch (err) {
			console.error("❌ BAN解除に失敗", err);
			alert("BAN解除に失敗しました");
		}
	};

	const handleLogout = async () => {
		try {
			await logout();
		} catch (err) {
			console.error("❌ ログアウトに失敗", err);
		} finally {
			clearStoredUser();
			setUser(null);
			setAuthLoading(false);
			navigate("/login", { replace: true });
		}
	};

	return (
		<div className="min-h-screen bg-gray-950 text-white p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-semibold">管理ダッシュボード</h1>
					<p className="text-sm text-gray-400">通報確認・BAN管理専用画面</p>
				</div>
				<div className="flex items-center gap-4">
					<span className="text-sm text-gray-300">{currentUser?.email}</span>
					<button type="button" className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600" onClick={handleRefresh}>
						再読込
					</button>
					<button type="button" className="px-3 py-2 rounded bg-red-500/80 hover:bg-red-500" onClick={handleLogout}>
						ログアウト
					</button>
				</div>
			</div>

			{loading ? (
				<p className="text-gray-400">読み込み中...</p>
			) : error ? (
				<p className="text-red-400">{error}</p>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<section className="bg-gray-900 rounded-lg p-4 border border-gray-800">
						<h2 className="text-xl font-semibold mb-4">未対応の通報</h2>
						{reports.length === 0 ? (
							<p className="text-sm text-gray-400">未対応の通報はありません</p>
						) : (
							<ul className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
								{reports.map((report) => (
									<li key={report.id} className="border border-gray-800 rounded-lg p-3">
										<p className="text-sm text-gray-400 mb-1">
											{report.reporter.nickname} → {report.reported_user.nickname}
										</p>
										<p className="text-sm text-gray-200 whitespace-pre-wrap bg-gray-800 rounded px-2 py-1 mb-2">
											{report.message_content || "(添付メッセージ)"}
										</p>
										<p className="text-xs text-gray-400 mb-2">通報理由: {report.reason}</p>
										<div className="flex gap-2">
											<button
												type="button"
												className="px-3 py-1 rounded bg-red-500/80 hover:bg-red-500 disabled:opacity-50"
												disabled={resolvingId === report.id}
												onClick={() => handleResolve(report, "ban")}
											>
												BAN
											</button>
											<button
												type="button"
												className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
												disabled={resolvingId === report.id}
												onClick={() => handleResolve(report, "reject")}
											>
												拒否
											</button>
										</div>
									</li>
								))}
							</ul>
						)}
					</section>

					<section className="bg-gray-900 rounded-lg p-4 border border-gray-800">
						<h2 className="text-xl font-semibold mb-4">BAN中ユーザー</h2>
						{bannedUsers.length === 0 ? (
							<p className="text-sm text-gray-400">BAN中のユーザーはいません</p>
						) : (
							<ul className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
								{bannedUsers.map((user) => (
									<li key={user.id} className="border border-gray-800 rounded-lg p-3">
										<p className="font-semibold">{user.nickname}</p>
										<p className="text-xs text-gray-400 break-all">{user.email}</p>
										<p className="text-xs text-gray-400">理由: {user.ban_reason ?? "未設定"}</p>
										<p className="text-xs text-gray-500">
											BAN日時: {user.banned_at ? new Date(user.banned_at).toLocaleString() : "不明"}
										</p>
										<p className="text-xs text-gray-500">
											解除予定: {user.ban_expires_at ? new Date(user.ban_expires_at).toLocaleString() : "無期限"}
										</p>
										<button
											type="button"
											className="mt-2 px-3 py-1 rounded bg-green-600/80 hover:bg-green-600"
											onClick={() => handleUnban(user.id)}
										>
											BAN解除
										</button>
									</li>
								))}
							</ul>
						)}
					</section>
				</div>
			)}
		</div>
	);
};

export default AdminDashboard;
