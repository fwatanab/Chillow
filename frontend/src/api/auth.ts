import axios from '../utils/axios';

declare global {
	interface Window {
		google: typeof google;
	}
}

// GoogleログインのAPI通信
export const loginWithGoogle = async (idToken: string) => {
	try {
		const res = await axios.post("/auth/google", {
			id_token: idToken
		});
		return res.data;
	} catch (err) {
		console.error("❌ サーバー通信エラー", err);
		throw err;
	}
};

// Google IDトークン取得
export async function getGoogleIdToken(): Promise<string | null> {
	return new Promise((resolve, reject) => {
		if (!window.google || !window.google.accounts || !window.google.accounts.id) {
			reject("❌ Google Identity Services が読み込まれていません");
			return;
		}

		let handled = false; // callbackやエラーを一度だけ実行するためのガード

		window.google.accounts.id.initialize({
			client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
			callback: (response: any) => {
				if (handled) return;
				handled = true;

				if (response.credential) {
					resolve(response.credential);
				} else {
					reject("❌ Google認証に失敗しました");
				}
			},
		});

		window.google.accounts.id.prompt((notification: any) => {
			if (handled) return;

			if (notification.isNotDisplayed()) {
				handled = true;
				reject("⚠️ Googleログインが表示されませんでした");
			} else if (notification.isSkippedMoment()) {
				handled = true;
				reject("⚠️ ユーザーがログインをスキップしました");
			}
		});
	});
}

