import { GoogleLogin } from '@react-oauth/google';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { authLoadingState, currentUserState } from '../store/auth';
import { loginWithGoogle } from '../services/api/auth';
import { Navigate, useNavigate } from 'react-router-dom';

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
      setUser(res.user);
      setLoading(false);
      navigate('/');
    } catch (err) {
      console.error("❌ サーバー認証に失敗しました", err);
    }
  };

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

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
