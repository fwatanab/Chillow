import { useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { authTokenState, currentUserState } from '../store/auth';
import axios from '../utils/axios';

export const useRestoreUser = () => {
	const currentToken = useRecoilValue(authTokenState);
	const setUser = useSetRecoilState(currentUserState);

	useEffect(() => {
		if (!currentToken) return;

		const token = localStorage.getItem('access_token');
		if (!token) {
			setUser(null);
			return;
		}

		axios.get('/users/me')
			.then((res) => {
				setUser(res.data);
			})
			.catch((err) => {
				console.warn('⚠️ 認証失敗', err);
				setUser(null);
				localStorage.removeItem('access_token');
			});
	}, [setUser]);
};

