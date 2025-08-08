import { GoogleLogin } from '@react-oauth/google';
import { useSetRecoilState } from 'recoil';
import { currentUserState } from '../store/auth';
import { loginWithGoogle } from '../api/auth';
import { useNavigate } from 'react-router-dom';

const Login = () => {
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

      // ✅ ローカルストレージに保存（共通axiosが使う）
      localStorage.setItem('access_token', res.token);

      // ✅ 現在のユーザー情報を保存
      setUser(res.user);

      // ✅ ホームに遷移
      navigate('/');
    } catch (err) {
      console.error("❌ サーバー認証に失敗しました", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <h2 className="heading mb-6 text-center">Chillowへログイン</h2>
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleLoginSuccess}
            onError={() => console.error("❌ Googleログインに失敗しました")}
            width="250"
          />
        </div>
      </div>
    </div>
  );
};

export default Login;



// import { GoogleLogin } from '@react-oauth/google';
// import { useSetRecoilState } from 'recoil';
// import { authTokenState, currentUserState } from '../store/auth';
// import { loginWithGoogle } from '../api/auth';
// import { useNavigate } from 'react-router-dom';
// 
// const Login = () => {
// 	const setToken = useSetRecoilState(authTokenState);
// 	const setUser = useSetRecoilState(currentUserState);
// 	const navigate = useNavigate();
// 
// 	const handleLoginSuccess = async (credentialResponse: any) => {
// 		const idToken = credentialResponse.credential;
// 		if (!idToken) {
// 			console.error("❌ IDトークンが取得できませんでした");
// 			return;
// 		}
// 		try {
// 			const res = await loginWithGoogle(idToken);
// 
// 			// ログイン成功時にトークンをブラウザに保持
// 			localStorage.setItem('access_token', res.token);
// 
// 			setToken(res.token);
// 			setUser(res.user);
// 			navigate('/');
// 		} catch (err) {
// 			console.error("❌ サーバー認証に失敗しました", err);
// 		}
// 	};
// 
// 
// 	return (
// 		<div className="min-h-screen flex items-center justify-center px-4">
// 			<div className="card w-full max-w-md">
// 				<h2 className="heading mb-6 text-center">Chillowへログイン</h2>
// 				<div className="flex justify-center">
// 					<GoogleLogin
// 						onSuccess={handleLoginSuccess}
// 						onError={() => console.error("❌ Googleログインに失敗しました")}
// 						width="250"
// 					/>
// 				</div>
// 			</div>
// 		</div>
// 	);
// };
// 
// export default Login;
// 
