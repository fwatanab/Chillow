import { atom } from 'recoil';
import type { User } from '../types/user';
import { loadStoredUser } from '../utils/authStorage';

export const currentUserState = atom<User | null>({
	key: 'currentUserState',
	default: loadStoredUser(),
});

export const authLoadingState = atom<boolean>({
	key: 'authLoadingState',
	default: true,
});
