import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getToken } from "../../shared/utils/token";

const baseUrl =
	(import.meta.env.VITE_API_URL as string | undefined) ??
	"http://localhost:3001";

const baseQueryWithErrorHandling = fetchBaseQuery({
	baseUrl: baseUrl.replace(/\/$/, ""),
	prepareHeaders: (headers) => {
		const token = getToken();
		if (token) {
			headers.set("Authorization", `Bearer ${token}`);
		}
		headers.set("Content-Type", "application/json");
		return headers;
	},
});

// Wrapper para manejar errores 404 específicamente para informes
const baseQuery = async (args: any, api: any, extraOptions: any) => {
	const result = await baseQueryWithErrorHandling(args, api, extraOptions);
	// Si es un 404 en /informes/cita/, no es un error real (el informe simplemente no existe)
	if (result.error && "status" in result.error && result.error.status === 404) {
		const url =
			typeof args === "string"
				? args
				: typeof args === "object" && args.url
					? args.url
					: "";
		if (url.includes("/informes/cita/")) {
			return { data: null };
		}
	}
	return result;
};

const baseApi = createApi({
	reducerPath: "api",
	baseQuery,
	tagTypes: ["Citas", "Disponibilidad", "Informes"],
	endpoints: () => ({}),
});

export { baseApi };
