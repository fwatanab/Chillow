import { GoogleLogin } from '@react-oauth/google'

const GoogleLoginButton = () => {
  const handleLogin = async (credentialResponse: any) => {
    const idToken = credentialResponse.credential
    console.log('🔑 取得したIDトークン:', idToken)

    if (!idToken) {
      console.error('❌ IDトークンが取得できませんでした')
      return
    }

    try {
      const res = await fetch('https://localhost:8443/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken })
      })

      const data = await res.json()
      console.log('✅ バックエンドからのレスポンス:', data)
    } catch (err) {
      console.error('❌ フロント→バック通信に失敗:', err)
    }
  }

  return (
    <GoogleLogin
      onSuccess={handleLogin}
      onError={() => console.error('❌ Googleログインに失敗しました')}
    />
  )
}

export default GoogleLoginButton

