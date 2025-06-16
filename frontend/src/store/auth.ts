import { atom } from 'recoil';

export const authTokenState = atom<string | null>({
	key: 'authToken',
	default: null,
});

export const currentUserState = atom<any>({
	key: 'currentUser',
	default: null,
});

