import { useEffect } from "react";
import { useSetRecoilState } from "recoil";
import { authLoadingState, currentUserState } from "../store/auth";
import { fetchCurrentUser } from "../services/api/user";

export const useRestoreUser = () => {
	const setUser = useSetRecoilState(currentUserState);
	const setLoading = useSetRecoilState(authLoadingState);

	useEffect(() => {
		let mounted = true;
		const restore = async () => {
			setLoading(true);
			try {
				const user = await fetchCurrentUser();
				if (mounted) {
					setUser(user);
				}
			} catch (err) {
				if (mounted) {
					console.error("❌ ユーザー情報の復元に失敗", err);
					setUser(null);
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
