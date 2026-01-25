const TOKEN_KEY = "garvis_token";

const getToken = () => localStorage.getItem(TOKEN_KEY);

const parseToken = (token: string) => {
	try {
		const payload = token.split(".")[1];
		if (!payload) return null;
		const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
		const decoded = atob(normalized);
		return JSON.parse(decoded);
	} catch {
		return null;
	}
};

const saveToken = (token: string) => {
	localStorage.setItem(TOKEN_KEY, token);
};

const clearToken = () => {
	localStorage.removeItem(TOKEN_KEY);
};

export { TOKEN_KEY, getToken, parseToken, saveToken, clearToken };
