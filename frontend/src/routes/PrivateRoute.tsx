import { Navigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { authLoadingState, currentUserState } from '../store/auth';
import type { ReactElement } from 'react';

interface Props {
	children: ReactElement;
	allowRoles?: string[];
	redirectPath?: string;
}

const PrivateRoute = ({ children, allowRoles, redirectPath }: Props): ReactElement => {
	const currentUser = useRecoilValue(currentUserState);
	const loading = useRecoilValue(authLoadingState);

	if (loading) {
		return (
			<div className="flex justify-center items-center h-screen text-gray-400">
				認証情報を確認中...
			</div>
		);
	}

	if (!currentUser) {
		return <Navigate to="/login" replace />;
	}

	if (allowRoles && !allowRoles.includes(currentUser.role)) {
		const fallback = currentUser.role === "admin" ? "/admin" : "/";
		return <Navigate to={redirectPath ?? fallback} replace />;
	}

	return children;
};

export default PrivateRoute;
