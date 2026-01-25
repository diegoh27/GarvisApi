import { getToken } from "../shared/utils/token";

type ApiError = Error & {
	status?: number;
	data?: unknown;
};

const baseUrl =
	(import.meta.env.VITE_API_URL as string | undefined) ??
	"http://localhost:3001";

const buildUrl = (path: string) => {
	if (path.startsWith("http")) {
		return path;
	}
	return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};

const request = async <T>(
	path: string,
	options: RequestInit = {},
): Promise<T> => {
	const token = getToken();
	const response = await fetch(buildUrl(path), {
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(options.headers ?? {}),
		},
		...options,
	});

	const contentType = response.headers.get("content-type") ?? "";
	const hasJson = contentType.includes("application/json");
	const data = hasJson ? await response.json() : null;

	if (!response.ok) {
		const message =
			(data as { message?: string } | null)?.message ?? "Error inesperado";
		const error: ApiError = Object.assign(new Error(message), {
			status: response.status,
			data,
		});
		throw error;
	}

	return data as T;
};

const apiClient = {
	get: <T>(path: string) => request<T>(path),
	post: <T>(path: string, body?: unknown) =>
		request<T>(path, {
			method: "POST",
			body: body ? JSON.stringify(body) : undefined,
		}),
	put: <T>(path: string, body?: unknown) =>
		request<T>(path, {
			method: "PUT",
			body: body ? JSON.stringify(body) : undefined,
		}),
	patch: <T>(path: string, body?: unknown) =>
		request<T>(path, {
			method: "PATCH",
			body: body ? JSON.stringify(body) : undefined,
		}),
};

export type { ApiError };
export { apiClient };
