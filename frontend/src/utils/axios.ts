import axios from "axios";

const instance = axios.create({
	baseURL: import.meta.env.VITE_API_URL,
	withCredentials: false,
});

// リクエストごとに Authorization を追加
instance.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('access_token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

export default instance;

