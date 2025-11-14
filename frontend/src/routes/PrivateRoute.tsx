import { Navigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { authLoadingState, currentUserState } from '../store/auth';
import type { ReactElement } from 'react';

interface Props {
	children: ReactElement;
}

const PrivateRoute = ({ children }: Props): ReactElement => {
	const currentUser = useRecoilValue(currentUserState);
	const loading = useRecoilValue(authLoadingState);

	if (loading) {
		return (
			<div className="flex justify-center items-center h-screen text-gray-400">
				認証情報を確認中...
			</div>
		);
	}

	return currentUser ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
