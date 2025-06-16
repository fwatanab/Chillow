import { GoogleLogin } from '@react-oauth/google';
import { useSetRecoilState } from 'recoil';
import { authTokenState, currentUserState } from '../store/auth';
import { loginWithGoogle } from '../api/auth';
import { useNavigate } from 'react-router-dom';

const Login = () => {
	const setToken = useSetRecoilState(authTokenState);
	const setUser = useSetRecoilState(currentUserState);
	const navigate = useNavigate();

	const handleLoginSuccess = async (credentialResponse: any) => {
		const idToken = credentialResponse.credential;
		if (!idToken) {
			console.error("❌ IDトークンが取得できませんでした");
			return;
		}
		try {
			const res = await loginWithGoogle(idToken);
			setToken(res.token);
			setUser(res.user);
			navigate('/');
		} catch (err) {
			console.error("❌ サーバー認証に失敗しました", err);
		}
	};

	return (
		<div>
			<h2>ログイン</h2>
			<GoogleLogin
				onSuccess={handleLoginSuccess}
				onError={() => console.error("❌ Googleログインに失敗しました")}
			/>
		</div>
	);
};

export default Login;

