/**
 * Subida de archivos con reporte de progreso (usando XMLHttpRequest).
 * Útil para archivos grandes (DICOM, ZIP).
 */

const getBaseUrl = () =>
	(String((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ?? "http://localhost:3001")).replace(
		/\/$/,
		"",
	);

export type UploadProgress = {
	loaded: number;
	total: number;
	percent: number;
};

export type UploadWithProgressOptions = {
	url: string;
	method?: "POST" | "PUT";
	body: FormData;
	token?: string | null;
	onProgress?: (progress: UploadProgress) => void;
};

export function uploadWithProgress<T = unknown>({
	url,
	method = "POST",
	body,
	token,
	onProgress,
}: UploadWithProgressOptions): Promise<T> {
	const baseUrl = getBaseUrl();
	const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;

	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();

		xhr.upload.addEventListener("progress", (e) => {
			if (e.lengthComputable && onProgress) {
				const percent = Math.round((e.loaded / e.total) * 100);
				onProgress({
					loaded: e.loaded,
					total: e.total,
					percent,
				});
			}
		});

		xhr.addEventListener("load", () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				try {
					const json = xhr.responseText ? JSON.parse(xhr.responseText) : {};
					resolve(json as T);
				} catch {
					resolve({} as T);
				}
			} else {
				let message = `Error ${xhr.status}`;
				try {
					const err = JSON.parse(xhr.responseText || "{}");
					if (err?.message) message = err.message;
				} catch {
					// ignore
				}
				reject(new Error(message));
			}
		});

		xhr.addEventListener("error", () => {
			reject(new Error("Error de red al subir"));
		});

		xhr.addEventListener("abort", () => {
			reject(new Error("Subida cancelada"));
		});

		xhr.open(method, fullUrl);
		if (token) {
			xhr.setRequestHeader("Authorization", `Bearer ${token}`);
		}

		xhr.send(body);
	});
}
