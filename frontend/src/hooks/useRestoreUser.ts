import { useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { authTokenState, currentUserState } from '../store/auth';
import axios from 'axios';

export const useRestoreUser = () => {
	const token = useRecoilValue(authTokenState);
	const setUser = useSetRecoilState(currentUserState);

	useEffect(() => {
		if (!token) return;

		axios.get('/api/users/me', {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then((res) => setUser(res.data))
			.catch(() => {
				console.warn('⚠️ トークン無効。ユーザー情報を初期化');
				localStorage.removeItem('authToken');
				setUser(null); // ユーザー情報も初期化しておくと良い
			});
	}, [token]);
};

