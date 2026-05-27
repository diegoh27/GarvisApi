export const normalizeImageUrl = (url: string | null | undefined): string | undefined => {
	if (!url) return undefined;
	const baseUrl = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:3001";
	// Replace localhost:3001 with the actual API base URL used by the frontend
	return url.replace(/^http:\/\/localhost:\d+/, baseUrl.replace(/\/$/, ""));
};
