import { GoogleLogin } from "@react-oauth/google";
import { useSetRecoilState, useRecoilValue } from "recoil";
import { authLoadingState, currentUserState } from "../store/auth";
import { loginWithGoogle } from "../services/api/auth";
import { Navigate, useNavigate } from "react-router-dom";
import { storeUser } from "../utils/authStorage";

const Login = () => {
	const setUser = useSetRecoilState(currentUserState);
	const setLoading = useSetRecoilState(authLoadingState);
	const navigate = useNavigate();
	const currentUser = useRecoilValue(currentUserState);

	const handleLoginSuccess = async (credentialResponse: any) => {
		const idToken = credentialResponse.credential;
		if (!idToken) {
			console.error("❌ IDトークンが取得できませんでした");
			return;
		}

		try {
			const res = await loginWithGoogle(idToken);
			storeUser(res.user);
			setUser(res.user);
			setLoading(false);
			navigate(res.user.role === "admin" ? "/admin" : "/");
		} catch (err) {
			console.error("❌ サーバー認証に失敗しました", err);
		}
	};

	if (currentUser) {
		return <Navigate to={currentUser.role === "admin" ? "/admin" : "/"} replace />;
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-[#15161c] via-[#0f1015] to-[#1c1f2b] px-4 py-10 text-white">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-3xl border border-white/5 bg-white/5 bg-clip-padding p-6 backdrop-blur-2xl lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
				<div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-gradient-to-br from-[#262a33] via-[#1d1f27] to-[#13141b] p-6 sm:p-8">
					<div>
						<p className="text-sm uppercase tracking-[0.3em] text-white/50">Chillow</p>
						<h1 className="mt-4 text-2xl font-semibold leading-tight text-white sm:text-3xl">
							仲間との距離をもっと近く<br />
							リアルタイムでつながるチャットアプリ
						</h1>
						<p className="mt-4 hidden text-sm text-white/70 lg:block">
							Chillow は「気付いた時にすぐつながれる」ためのシンプルなチャットアプリです。友だち管理も、ステータス確認も、スタンプや写真のやりとりも同じ画面で完結し、
							思い立った瞬間に開いてすぐ会話に入り直せます。
						</p>
					</div>
					<ul className="mt-10 space-y-4 text-sm">
						<li className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
							<span className="text-discord-accent">●</span>
							<div>
								<p className="font-semibold text-white">ワンタップでスタート</p>
								<p className="text-white/60">Google 認証だけでサインイン完了。URLを受け取ってすぐに会話へ参加できます。</p>
							</div>
						</li>
						<li className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
							<span className="text-discord-accent">●</span>
							<div>
								<p className="font-semibold text-white">気持ちが伝わる演出</p>
								<p className="text-white/60">スタンプ/絵文字切り替えや写真共有をいつもの UI で。楽しい場面も大事な場面も表現しやすく。</p>
							</div>
						</li>
						<li className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
							<span className="text-discord-accent">●</span>
							<div>
								<p className="font-semibold text-white">いつものデバイスで自然に</p>
								<p className="text-white/60">モバイルはホーム感覚で、PCは広い画面で。どちらも違和感なく同じ操作感で使えます。</p>
							</div>
						</li>
					</ul>
				</div>

				<div className="flex flex-col justify-center rounded-2xl border border-white/10 bg-[#14161d]/80 p-6 shadow-2xl sm:p-10">
					<div className="text-center">
						<p className="text-xs uppercase tracking-[0.3em] text-white/50">Sign in</p>
						<h2 className="mt-3 text-2xl font-semibold">Chillow へログイン</h2>
						<p className="mt-2 text-sm text-white/60">Google アカウントを使って安全にサインインできます。</p>
					</div>

					<div className="mt-8 flex justify-center">
						<GoogleLogin onSuccess={handleLoginSuccess} onError={() => console.error("❌ Googleログインに失敗しました")} width="280" />
					</div>

					<div className="mt-8 space-y-2 text-xs text-white/60">
						<p>・初回ログイン時にアカウントが自動作成されます。</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Login;
