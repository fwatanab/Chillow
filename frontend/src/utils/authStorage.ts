import type { User } from "../types/user";

const STORAGE_KEY = "chillow_current_user";

export const loadStoredUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const storeUser = (user: User) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
};

export const clearStoredUser = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
};
