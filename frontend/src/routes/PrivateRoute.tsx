import { Navigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { authTokenState } from '../store/auth';
import type { ReactElement } from 'react';

interface Props {
	children: ReactElement;
}

const PrivateRoute = ({ children }: Props): ReactElement => {
	const token = useRecoilValue(authTokenState);
	return token ? children : <Navigate to="/login" />;
};

export default PrivateRoute;

