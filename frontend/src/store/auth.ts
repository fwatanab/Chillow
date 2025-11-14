import { atom } from 'recoil';
import type { User } from '../types/user';

export const currentUserState = atom<User | null>({
	key: 'currentUserState',
	default: null,
});

export const authLoadingState = atom<boolean>({
	key: 'authLoadingState',
	default: true,
});
