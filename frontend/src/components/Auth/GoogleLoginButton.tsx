import { GoogleLogin } from '@react-oauth/google'

interface Props {
  onSuccess: (token: string) => void
}

const GoogleLoginButton = ({ onSuccess }: Props) => {
  return (
    <GoogleLogin
      onSuccess={(credentialResponse) => {
        if (credentialResponse.credential) {
          onSuccess(credentialResponse.credential)
        }
      }}
      onError={() => {
        alert('ログインに失敗しました')
      }}
    />
  )
}

export default GoogleLoginButton

