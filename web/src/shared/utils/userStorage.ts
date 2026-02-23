import type { AuthUser } from "../types/auth";

const USER_KEY = "garvis_user";

const getStoredUser = () => {
	try {
		const raw = localStorage.getItem(USER_KEY);
		if (!raw) return null;
		return JSON.parse(raw) as AuthUser;
	} catch {
		return null;
	}
};

const saveStoredUser = (user: AuthUser | null) => {
	if (!user) {
		localStorage.removeItem(USER_KEY);
		return;
	}
	localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const clearStoredUser = () => {
	localStorage.removeItem(USER_KEY);
};

export { USER_KEY, getStoredUser, saveStoredUser, clearStoredUser };
