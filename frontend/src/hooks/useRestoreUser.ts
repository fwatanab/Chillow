import { useEffect } from "react";
import { useSetRecoilState } from "recoil";
import { authLoadingState, currentUserState } from "../store/auth";
import { fetchCurrentUser } from "../services/api/user";
import { clearStoredUser, loadStoredUser, storeUser } from "../utils/authStorage";
import type { AxiosError } from "axios";

export const useRestoreUser = () => {
	const setUser = useSetRecoilState(currentUserState);
	const setLoading = useSetRecoilState(authLoadingState);

	useEffect(() => {
		let mounted = true;
		const cachedUser = loadStoredUser();
		const restore = async () => {
			setLoading(true);
			try {
				const user = await fetchCurrentUser();
				if (mounted) {
					storeUser(user);
					setUser(user);
				}
			} catch (err) {
				if (mounted) {
					const status = (err as AxiosError)?.response?.status;
					if (status === 401) {
						clearStoredUser();
						setUser(null);
					} else {
						console.error("❌ ユーザー情報の復元に失敗", err);
						if (!cachedUser) {
							setUser(null);
						}
					}
				}
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		};
		restore();
		return () => {
			mounted = false;
		};
	}, [setLoading, setUser]);
};
