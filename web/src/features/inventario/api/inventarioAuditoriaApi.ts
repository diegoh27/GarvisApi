import { baseApi } from "../../../app/api/baseApi";

// ==========================================
// TIPOS
// ==========================================

export type AuditoriaInventarioItem = {
	id: number;
	modulo: string;
	accion: string;
	entidad_tipo: string | null;
	entidad_id: string | null;
	id_usuario: string | null;
	usuario_nombre: string | null;
	usuario_rol: string | null;
	detalles: string | null;
	fecha: string;
};

export type GetInventarioAuditoriaParams = {
	modulo?: string;
	limit?: number;
	offset?: number;
};

export type GetInventarioAuditoriaResponse = {
	rows: AuditoriaInventarioItem[];
	total: number;
	limit: number;
	offset: number;
};

const inventarioAuditoriaApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getInventarioAuditoria: builder.query<
			GetInventarioAuditoriaResponse,
			GetInventarioAuditoriaParams | void
		>({
			query: (params = {}) => {
				const searchParams = new URLSearchParams();
				if (params?.modulo) searchParams.set("modulo", params.modulo);
				if (params?.limit) searchParams.set("limit", String(params.limit));
				if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));
				const qs = searchParams.toString();
				return {
					url: `/inventario/auditoria${qs ? `?${qs}` : ""}`,
					method: "GET",
				};
			},
			transformResponse: (response: {
				ok: boolean;
				data: GetInventarioAuditoriaResponse;
			}) => response.data,
			providesTags: ["InventarioAuditoria"],
		}),
	}),
	overrideExisting: false,
});

export const { useGetInventarioAuditoriaQuery } = inventarioAuditoriaApi;
export { inventarioAuditoriaApi };
