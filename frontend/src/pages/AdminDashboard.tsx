import { useEffect, useMemo, useState } from "react";
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
	const [activeTab, setActiveTab] = useState<"reports" | "banned">("reports");
	const navigate = useNavigate();
	const apiBase = useMemo(() => import.meta.env.VITE_API_URL ?? "http://localhost:8080/api", []);
	const adminAvatar = currentUser?.avatar_url ?? "";
	const adminInitial = (currentUser?.nickname || currentUser?.email || "?").charAt(0).toUpperCase();

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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const source = new EventSource(`${apiBase}/admin/events`, { withCredentials: true });
		source.onmessage = (event) => {
			try {
				const payload = JSON.parse(event.data) as { type: string; report?: AdminReport; user?: BannedUser };
				switch (payload.type) {
					case "report:new":
						if (payload.report) {
							setReports((prev) => {
								const exists = prev.some((r) => r.id === payload.report!.id);
								return exists ? prev : [payload.report!, ...prev];
							});
						}
						break;
					case "report:resolved":
						if (payload.report) {
							setReports((prev) => prev.filter((report) => report.id !== payload.report!.id));
						}
						break;
					case "user:banned":
						if (payload.user) {
							setBannedUsers((prev) => {
								const exists = prev.some((user) => user.id === payload.user!.id);
								return exists ? prev.map((user) => (user.id === payload.user!.id ? payload.user! : user)) : [payload.user!, ...prev];
							});
						}
						break;
					case "user:unbanned":
						if (payload.user) {
							setBannedUsers((prev) => prev.filter((user) => user.id !== payload.user!.id));
						}
						break;
					default:
						break;
				}
			} catch (err) {
				console.error("❌ 管理イベントの処理に失敗", err);
			}
		};
		source.onerror = () => {
			console.error("⚠️ 管理イベントストリームでエラーが発生");
		};
		return () => {
			source.close();
		};
	}, [apiBase]);

	const handleResolve = async (report: AdminReport, action: "ban" | "reject") => {
		try {
			setResolvingId(report.id);
			if (action === "ban") {
				const banReason = window.prompt("BAN理由を入力してください", `通報理由: ${report.reason}`);
				if (!banReason) return;
				const durationInput = window.prompt("BAN期間を時間で指定（空欄で無期限）");
				const duration = durationInput ? Number(durationInput) : null;
				const updated = await resolveReport(report.id, { action: "ban", ban_reason: banReason, duration_hours: duration ?? undefined });
				setReports((prev) => prev.filter((item) => item.id !== report.id));
				if (updated.reported_user) {
					setBannedUsers((prev) => {
						const exists = prev.some((user) => user.id === updated.reported_user!.id);
						if (exists) {
							return prev.map((user) => (user.id === updated.reported_user!.id ? { ...user, ...updated.reported_user } : user));
						}
						return [{ ...updated.reported_user, is_banned: true }, ...prev];
					});
				}
			} else {
				const note = window.prompt("拒否理由（任意）") ?? "";
				await resolveReport(report.id, { action: "reject", note });
				setReports((prev) => prev.filter((item) => item.id !== report.id));
			}
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
			setBannedUsers((prev) => prev.filter((user) => user.id !== userId));
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
		<div className="min-h-screen bg-[#1b1d23] text-white flex flex-col">
			<header className="bg-[#292b31] border-b border-white/5">
				<div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-4 sm:px-6">
					<p className="text-sm text-white/60">運営専用モニタリング</p>
					<h1 className="text-2xl font-semibold">管理ダッシュボード</h1>
				</div>
			</header>

			<main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
				<section className="flex flex-wrap gap-3">
					<div className="min-w-[150px] flex-1 rounded-2xl border border-white/10 bg-[#24262f] p-4 shadow-lg">
						<p className="text-xs text-white/60">未対応の通報</p>
						<p className="mt-1 text-3xl font-semibold text-amber-300">{reports.length}</p>
						<p className="hidden text-xs text-white/50 sm:block">新しい通報はリアルタイムにここへ追加されます。</p>
						<p className="text-[0.6rem] text-white/50 sm:hidden">リアルタイムで更新されます。</p>
					</div>
					<div className="min-w-[150px] flex-1 rounded-2xl border border-white/10 bg-[#24262f] p-4 shadow-lg">
						<p className="text-xs text-white/60">BAN中ユーザー</p>
						<p className="mt-1 text-3xl font-semibold text-emerald-300">{bannedUsers.length}</p>
						<p className="hidden text-xs text-white/50 sm:block">解除は下部カードの「BAN解除」から実行します。</p>
						<p className="text-[0.6rem] text-white/50 sm:hidden">解除は一覧から実行。</p>
					</div>
				</section>

				<section className="rounded-2xl border border-white/10 bg-[#24262f] shadow-2xl">
					<div className="flex gap-4 border-b border-white/5 px-4 py-4 sm:items-center sm:px-6">
						<div className="flex-1">
							<h2 className="text-xl font-semibold">{activeTab === "reports" ? "通報一覧" : "BAN中ユーザー"}</h2>
							<p className="hidden text-sm text-white/60 sm:block">
								{activeTab === "reports" ? "ユーザーから寄せられた通報の詳細を確認できます。" : "現在制限中のユーザー一覧です。"}
							</p>
							<p className="text-xs text-white/60 sm:hidden">{activeTab === "reports" ? "通報詳細を確認" : "BAN中ユーザー一覧"}</p>
						</div>
						<div className="ml-auto flex flex-row justify-end gap-1 text-[0.6rem] text-right sm:w-auto sm:gap-2 sm:text-sm sm:text-left">
							<button
								type="button"
								className={`min-w-[4.2rem] rounded-lg px-1 py-0.5 font-semibold transition sm:min-w-[9rem] sm:px-3 sm:py-1.5 ${
									activeTab === "reports"
										? "bg-discord-accent text-white shadow-lg"
										: "bg-white/5 text-white/70 hover:bg-white/10"
								}`}
								onClick={() => setActiveTab("reports")}
							>
								通報一覧
							</button>
							<button
								type="button"
								className={`min-w-[4.2rem] rounded-lg px-1 py-0.5 font-semibold transition sm:min-w-[9rem] sm:px-3 sm:py-1.5 ${
									activeTab === "banned"
										? "bg-discord-accent text-white shadow-lg"
										: "bg-white/5 text-white/70 hover:bg-white/10"
								}`}
								onClick={() => setActiveTab("banned")}
							>
								BAN中ユーザー
							</button>
						</div>
					</div>

					<div className="px-4 py-4 sm:px-6">
						{loading ? (
							<p className="text-white/60">読み込み中...</p>
						) : error ? (
							<p className="text-red-400">{error}</p>
						) : activeTab === "reports" ? (
							<>
								{reports.length === 0 ? (
									<p className="text-sm text-white/60">未対応の通報はありません。</p>
								) : (
									<ul className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
										{reports.map((report) => (
											<li key={report.id} className="rounded-2xl border border-white/10 bg-[#1f2129] p-4 shadow-inner">
												<div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-white/70">
													<span className="font-semibold text-white">{report.reporter.nickname}</span>
													<span className="text-white/50">→</span>
													<span className="font-semibold text-white">{report.reported_user.nickname}</span>
												</div>
												<p className="whitespace-pre-wrap rounded-xl bg-black/30 px-3 py-2 text-sm text-white/80">
													{report.message_content || "(添付メッセージ)"}
												</p>
												<p className="mt-2 text-xs text-white/60">通報理由: {report.reason}</p>
												<div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-3">
													<button
														type="button"
														className="flex-1 rounded-lg bg-red-500/80 px-3 py-2 text-sm font-semibold hover:bg-red-500 disabled:opacity-50"
														disabled={resolvingId === report.id}
														onClick={() => handleResolve(report, "ban")}
													>
														BAN
													</button>
													<button
														type="button"
														className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
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
							</>
						) : (
							<>
								{bannedUsers.length === 0 ? (
									<p className="text-sm text-white/60">BAN中のユーザーはいません。</p>
								) : (
									<ul className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
										{bannedUsers.map((user) => (
											<li key={user.id} className="rounded-2xl border border-white/10 bg-[#1f2129] p-4 shadow-inner">
												<div className="flex flex-col gap-1">
													<p className="text-lg font-semibold">{user.nickname}</p>
													<p className="text-xs text-white/60 break-all">{user.email}</p>
												</div>
												<p className="mt-2 text-xs text-white/60">理由: {user.ban_reason ?? "未設定"}</p>
												<p className="text-xs text-white/50">
													BAN日時: {user.banned_at ? new Date(user.banned_at).toLocaleString() : "不明"}
												</p>
												<p className="text-xs text-white/50">
													解除予定: {user.ban_expires_at ? new Date(user.ban_expires_at).toLocaleString() : "無期限"}
												</p>
												<button
													type="button"
													className="mt-3 rounded-lg bg-emerald-500/80 px-3 py-2 text-sm font-semibold hover:bg-emerald-500"
													onClick={() => handleUnban(user.id)}
												>
													BAN解除
												</button>
											</li>
										))}
									</ul>
								)}
							</>
						)}
					</div>
				</section>
			</main>

			<footer className="bg-[#292b31] border-t border-white/5">
				<div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-4 px-4 py-4 text-sm text-white/70 sm:justify-between sm:px-6">
					<div className="flex min-w-0 flex-1 items-center gap-3">
						<div className="h-12 w-12 rounded-full border border-white/10 bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-base font-bold text-white">
							{adminAvatar ? (
								<img src={adminAvatar} alt="admin avatar" className="h-full w-full rounded-full object-cover" />
							) : (
								adminInitial
							)}
						</div>
						<div className="space-y-1 min-w-0">
							<p className="text-xs uppercase tracking-wide text-white/50">管理者</p>
							<p className="text-base font-semibold text-white truncate">{currentUser?.nickname ?? "(名無し)"}</p>
							<p className="break-all">{currentUser?.email ?? "-"}</p>
						</div>
					</div>
					<button
						type="button"
						className="ml-auto rounded-lg bg-red-500/80 px-4 py-2 font-semibold hover:bg-red-500"
						onClick={handleLogout}
					>
						ログアウト
					</button>
				</div>
			</footer>
		</div>
	);
};

export default AdminDashboard;
