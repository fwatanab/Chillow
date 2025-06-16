import { atom } from 'recoil';
import type { User } from '../types';

// ローカルストレージからトークンを取得する関数
const getInitialToken = (): string | null => {
	if (typeof window !== 'undefined') {
		return localStorage.getItem('authToken');
	}
	return null;
};

// トークンの Recoil 状態
export const authTokenState = atom<string | null>({
	key: 'authTokenState',
	default: getInitialToken(), // ← ローカルストレージから初期化
});

// ログイン中のユーザー情報
export const currentUserState = atom<User | null>({
	key: 'currentUserState',
	default: null,
});

