import { useEffect } from "react";
import { useSetRecoilState } from "recoil";
import { currentUserState } from "../store/auth";
import { fetchCurrentUser } from "../api/user";

export const useRestoreUser = () => {
  const setUser = useSetRecoilState(currentUserState);

  // 初回マウント時に復元
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    fetchCurrentUser()
      .then(setUser)
      .catch((err) => {
        console.error("❌ ユーザー情報の復元に失敗", err);
        setUser(null);
      });
  }, []);

  // 他タブからの更新を検知して同期
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "access_token") {
        const token = e.newValue;

        if (!token) {
          setUser(null); // ログアウト
          return;
        }

        fetchCurrentUser()
          .then(setUser)
          .catch((err) => {
            console.error("❌ ユーザー同期に失敗", err);
            setUser(null);
          });
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);
};



// import { useEffect } from 'react';
// import { useRecoilValue, useSetRecoilState } from 'recoil';
// import { authTokenState, currentUserState } from '../store/auth';
// import { fetchCurrentUser } from "../api/user";
// 
// export const useRestoreUser = () => {
// 	const currentToken = useRecoilValue(authTokenState);
// 	const setUser = useSetRecoilState(currentUserState);
// 
// 	useEffect(() => {
// 		if (!currentToken) return;
// 
// 		const token = localStorage.getItem('access_token');
// 		if (!token) {
// 			setUser(null);
// 			return;
// 		}
// 
// 		fetchCurrentUser()
// 		.then(setUser)
// 		.catch((err) => {
// 			console.warn("⚠️ 認証失敗", err);
// 			setUser(null);
// 			localStorage.removeItem("access_token");
// 		});
// 	}, [setUser]);
// };
// 
