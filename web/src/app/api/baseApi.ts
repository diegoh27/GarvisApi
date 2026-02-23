import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getToken } from "../../shared/utils/token";
import { clearAuth } from "../../features/auth/authSlice";

const LOGIN_PATH = "/auth/login";
const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/auth/forgot", "/"];

let redirectingToLogin = false;

function isPublicPath(pathname: string): boolean {
	return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Ante 401: limpia sesión y redirige a login una sola vez (evita múltiples redirects). */
function handleUnauthorized(dispatch: (a: unknown) => void): void {
	dispatch(clearAuth());
	const pathname = window.location.pathname;
	if (isPublicPath(pathname)) return;
	if (redirectingToLogin) return;
	redirectingToLogin = true;
	window.location.href = `${LOGIN_PATH}?session_expired=1`;
}

const baseUrl =
	(import.meta.env.VITE_API_URL as string | undefined) ??
	"http://localhost:3001";

// Content-Type: fetchBaseQuery lo setea automáticamente para JSON cuando hay body objeto.
// No setearlo acá evita romper FormData, text/plain, requests sin body, etc.
const baseQueryWithErrorHandling = fetchBaseQuery({
	baseUrl: baseUrl.replace(/\/$/, ""),
	prepareHeaders: (headers) => {
		const token = getToken();
		if (token) {
			headers.set("Authorization", `Bearer ${token}`);
		}
		return headers;
	},
});

/** Wrapper que ante 401 desloguea y redirige a login. */
const baseQueryWithAuth = async (args: any, api: any, extraOptions: any) => {
	const result = await baseQueryWithErrorHandling(args, api, extraOptions);
	if (result.error && "status" in result.error && result.error.status === 401) {
		handleUnauthorized(api.dispatch);
	}
	return result;
};

// Base query que maneja FormData correctamente
const baseQueryWithFormData = async (args: any, api: any, extraOptions: any) => {
	// Si el body es FormData, usar un baseQuery sin Content-Type
	if (
		typeof args === "object" &&
		args !== null &&
		"body" in args &&
		args.body instanceof FormData
	) {
		const formDataQuery = fetchBaseQuery({
			baseUrl: baseUrl.replace(/\/$/, ""),
			prepareHeaders: (headers) => {
				const token = getToken();
				if (token) {
					headers.set("Authorization", `Bearer ${token}`);
				}
				return headers;
			},
		});
		const result = await formDataQuery(args, api, extraOptions);
		if (result.error && "status" in result.error && result.error.status === 401) {
			handleUnauthorized(api.dispatch);
		}
		return result;
	}
	return baseQueryWithAuth(args, api, extraOptions);
};

const baseApi = createApi({
	reducerPath: "api",
	baseQuery: baseQueryWithFormData,
	tagTypes: [
		"Citas",
		"Disponibilidad",
		"Informes",
		"Resultados",
		"Especialidades",
		"Ecos",
		"Usuarios",
		"Representados",
		"Productos",
		"Notificaciones",
		// Inventario - Productos
		"Compras",
		"HistorialCompras",
		"Ajustes",
		"HistorialAjustes",
		// Inventario - Entes Legales
		"EntesLegales",
		"Obligaciones",
		"HistorialEnteLegal",
		// Inventario - Nómina
		"Empleado",
		"NominaPago",
		// Inventario - Alquiler
		"AlquilerContrato",
		"AlquilerPago",
		// Inventario - Comisiones Especialistas
		"EspecialistaComision",
		// Inventario - Facturación
		"Facturacion",
		// Admin - Métodos de Pago
		"MetodosPago",
		// Configuración - Perfil
		"Perfil",
		// Permisos inventario moderador
		"PermisosInventario",
	],
	endpoints: () => ({}),
});

export { baseApi };
