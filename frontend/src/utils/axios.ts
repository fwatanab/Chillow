import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";

const instance = axios.create({
	baseURL: API_BASE_URL,
	withCredentials: true,
});

export default instance;
