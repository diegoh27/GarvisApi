import { baseApi } from "../../app/api/baseApi";

export type AuditoriaEvento = {
	id: number;
	usuario_id: string | null;
	usuario_nombre: string | null;
	usuario_correo: string | null;
	usuario_rol: string | null;
	metodo: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	ruta: string;
	accion: string;
	estado_http: number;
	estado: "exito" | "fallo";
	ip: string | null;
	fecha: string;
};

export type AuditoriaUsuario = {
	usuario_id: string;
	usuario_nombre: string;
	usuario_correo: string;
	usuario_rol: string;
};

export type AuditoriaResponse = {
	ok: boolean;
	total: number;
	page: number;
	limit: number;
	data: AuditoriaEvento[];
};

export type AuditoriaUsuariosResponse = {
	ok: boolean;
	data: AuditoriaUsuario[];
};

export type AuditoriaFilters = {
	usuarioId?: string;
	metodo?: string;
	estado?: string;
	fechaDesde?: string;
	fechaHasta?: string;
	page?: number;
	limit?: number;
};

const auditoriaApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getAuditoriaEventos: builder.query<AuditoriaResponse, AuditoriaFilters>({
			query: (filters = {}) => {
				const params = new URLSearchParams();
				if (filters.usuarioId)  params.set("usuarioId",  filters.usuarioId);
				if (filters.metodo)     params.set("metodo",     filters.metodo);
				if (filters.estado)     params.set("estado",     filters.estado);
				if (filters.fechaDesde) params.set("fechaDesde", filters.fechaDesde);
				if (filters.fechaHasta) params.set("fechaHasta", filters.fechaHasta);
				if (filters.page)       params.set("page",       String(filters.page));
				if (filters.limit)      params.set("limit",      String(filters.limit));
				return `/auditoria?${params.toString()}`;
			},
			providesTags: ["Auditoria"],
		}),
		getAuditoriaUsuarios: builder.query<AuditoriaUsuariosResponse, void>({
			query: () => "/auditoria/usuarios",
			providesTags: ["Auditoria"],
		}),
	}),
	overrideExisting: false,
});

export const {
	useGetAuditoriaEventosQuery,
	useGetAuditoriaUsuariosQuery,
} = auditoriaApi;
