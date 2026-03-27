import { baseApi } from "../../app/api/baseApi";

type DisponibilidadPublicaParams = {
	fecha?: string;
	id_especialista?: string;
};

export type DisponibilidadPublicaPorEcoParams = {
	id_eco: string;
	fecha?: string;
};

export type DisponibilidadPublicaPorEcoItem = {
	id_disponibilidad: string;
	fecha: string;
	hora_inicio: string;
	hora_fin: string;
	id_eco: string | null;
	eco_nombre: string | null;
	id_especialista: string;
	especialista_nombre: string;
	especialista_apellido: string;
	especialidad_nombre: string;
};

export type DisponibilidadPendiente = {
	id_disponibilidad: string;
	id_especialista: string;
	fecha: string;
	hora_inicio: string;
	hora_fin: string;
	id_eco?: string | null;
	eco_nombre?: string | null;
	estado: number;
	nombre: string;
	apellido: string;
	especialidad: string;
};

/** Solicitud macro (rango) antes de generar bloques de 20 min. */
export type DisponibilidadSolicitudMacro = {
	id_solicitud: string;
	id_especialista: string;
	fecha_desde: string;
	fecha_hasta: string;
	hora_inicio: string;
	hora_fin: string;
	id_eco?: string | null;
	/** Varias filas de eco en una sola solicitud (JSON en BD); el listado enriquece `eco_nombre`. */
	id_ecos_json?: string | unknown | null;
	es_manual?: number;
	estado: number;
	creado_en?: string;
	nombre: string;
	apellido: string;
	especialidad: string;
	eco_nombre?: string | null;
};

export type DisponibilidadGestionAdmin = {
	bloques: DisponibilidadPendiente[];
	solicitudes: DisponibilidadSolicitudMacro[];
};

export type AprobarSolicitudMacroData = {
	id_solicitud: string;
	bloques_creados: number;
	bloques_omitidos: number;
	ids_creados: string[];
};

function normalizeGestionAdmin(
	data: unknown,
): DisponibilidadGestionAdmin {
	if (
		data &&
		typeof data === "object" &&
		"bloques" in (data as object) &&
		"solicitudes" in (data as object)
	) {
		const d = data as DisponibilidadGestionAdmin;
		return {
			bloques: d.bloques ?? [],
			solicitudes: d.solicitudes ?? [],
		};
	}
	if (Array.isArray(data)) {
		return { bloques: data as DisponibilidadPendiente[], solicitudes: [] };
	}
	return { bloques: [], solicitudes: [] };
}

/** Respuesta envuelta `{ ok, message, data }` de endpoints de disponibilidad en la API. */
export type DisponibilidadApiEnvelope<T> = {
	ok: boolean;
	message: string;
	data: T;
};

/**
 * Cuerpo `data` tras PATCH `/disponibilidad/:id/aprobar`.
 * Si hay conflicto con otro especialista en el mismo eco, el backend deja `estado: 2` y `rechazo_automatico`.
 */
export type AprobarDisponibilidadData = {
	id_disponibilidad: string;
	estado: number;
	rechazo_automatico?: true;
	message?: string;
};

/**
 * Cuerpo `data` tras POST `/disponibilidad/aprobar-lote` o `/disponibilidad/aprobar-por-criterios`.
 */
export type AprobarDisponibilidadLoteData = {
	aprobados: number;
	ids: string[];
	rechazados_automatico: number;
	ids_rechazados_automatico: string[];
};

const disponibilidadApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getDisponibilidadPublica: builder.query<unknown, DisponibilidadPublicaParams | void>({
			query: (params) => ({
				url: "/disponibilidad/publica",
				params: params ?? undefined,
			}),
			providesTags: ["Disponibilidad"],
		}),
		getDisponibilidadPublicaPorEco: builder.query<
			DisponibilidadPublicaPorEcoItem[],
			DisponibilidadPublicaPorEcoParams
		>({
			query: (params) => ({
				url: "/disponibilidad/publica",
				params,
			}),
			transformResponse: (
				response: { ok: boolean; data: DisponibilidadPublicaPorEcoItem[] }
			) => response.data ?? [],
			providesTags: ["Disponibilidad"],
		}),
		getDisponibilidadPorFecha: builder.query<
			DisponibilidadPublicaPorEcoItem[],
			{ fecha: string }
		>({
			query: (params) => ({
				url: "/disponibilidad/publica",
				params,
			}),
			transformResponse: (
				response: { ok: boolean; data: DisponibilidadPublicaPorEcoItem[] }
			) => response.data ?? [],
			providesTags: ["Disponibilidad"],
		}),
		getDisponibilidadPendientes: builder.query<DisponibilidadPendiente[], void>({
			query: () => "/disponibilidad/pendientes",
			transformResponse: (response: { ok: boolean; data: DisponibilidadPendiente[] }) =>
				response.data ?? [],
			providesTags: ["Disponibilidad"],
		}),
		getDisponibilidadAdmin: builder.query<DisponibilidadGestionAdmin, void>({
			query: () => "/disponibilidad/todas",
			transformResponse: (response: { ok: boolean; data: unknown }) =>
				normalizeGestionAdmin(response?.data),
			providesTags: ["Disponibilidad"],
		}),
		crearSolicitudMacro: builder.mutation<
			{ id_solicitud: string },
			{
				fecha_desde: string;
				fecha_hasta: string;
				hora_inicio: string;
				hora_fin: string;
				/** Una sola solicitud con todos los ecos seleccionados. */
				id_ecos?: string[];
				id_eco?: string | null;
			}
		>({
			query: (body) => ({
				url: "/disponibilidad/solicitud-macro",
				method: "POST",
				body,
			}),
			transformResponse: (response: { ok: boolean; data: { id_solicitud: string } }) =>
				response.data,
			invalidatesTags: ["Disponibilidad"],
		}),
		crearSolicitudMacroManual: builder.mutation<
			{ id_solicitud: string },
			{
				id_especialista: string;
				fecha_desde: string;
				fecha_hasta: string;
				hora_inicio: string;
				hora_fin: string;
				id_ecos?: string[];
				id_eco?: string | null;
			}
		>({
			query: (body) => ({
				url: "/disponibilidad/solicitud-macro-manual",
				method: "POST",
				body,
			}),
			transformResponse: (response: { ok: boolean; data: { id_solicitud: string } }) =>
				response.data,
			invalidatesTags: ["Disponibilidad"],
		}),
		aprobarSolicitudMacro: builder.mutation<
			DisponibilidadApiEnvelope<AprobarSolicitudMacroData>,
			string
		>({
			query: (id) => ({
				url: `/disponibilidad/solicitud/${id}/aprobar`,
				method: "PATCH",
			}),
			invalidatesTags: ["Disponibilidad"],
		}),
		rechazarSolicitudMacro: builder.mutation<
			{ id_solicitud: string; estado: number },
			string
		>({
			query: (id) => ({
				url: `/disponibilidad/solicitud/${id}/rechazar`,
				method: "PATCH",
			}),
			transformResponse: (response: {
				ok: boolean;
				data: { id_solicitud: string; estado: number };
			}) => response.data,
			invalidatesTags: ["Disponibilidad"],
		}),
		aprobarDisponibilidad: builder.mutation<
			DisponibilidadApiEnvelope<AprobarDisponibilidadData>,
			string
		>({
			query: (id) => ({
				url: `/disponibilidad/${id}/aprobar`,
				method: "PATCH",
			}),
			invalidatesTags: ["Disponibilidad"],
		}),
		rechazarDisponibilidad: builder.mutation<
			{ id_disponibilidad: string; estado: number },
			string
		>({
			query: (id) => ({
				url: `/disponibilidad/${id}/rechazar`,
				method: "PATCH",
			}),
			invalidatesTags: ["Disponibilidad"],
		}),
		aprobarDisponibilidadLote: builder.mutation<
			DisponibilidadApiEnvelope<AprobarDisponibilidadLoteData>,
			{ ids: string[] }
		>({
			query: (body) => ({
				url: "/disponibilidad/aprobar-lote",
				method: "POST",
				body,
			}),
			invalidatesTags: ["Disponibilidad"],
		}),
		aprobarDisponibilidadPorCriterios: builder.mutation<
			DisponibilidadApiEnvelope<AprobarDisponibilidadLoteData>,
			{ id_especialista?: string; fecha_desde?: string; fecha_hasta?: string; hora_desde?: string; hora_hasta?: string }
		>({
			query: (body) => ({
				url: "/disponibilidad/aprobar-por-criterios",
				method: "POST",
				body,
			}),
			invalidatesTags: ["Disponibilidad"],
		}),
		cancelarDisponibilidadAdmin: builder.mutation<
			{ id_disponibilidad: string; estado: number },
			string
		>({
			query: (id) => ({
				url: `/disponibilidad/${id}/cancelar-admin`,
				method: "PATCH",
			}),
			invalidatesTags: ["Disponibilidad"],
		}),
		cancelarDisponibilidadLote: builder.mutation<
			{ cancelados: number; ids: string[] },
			{ ids: string[] }
		>({
			query: (body) => ({
				url: "/disponibilidad/cancelar-lote",
				method: "POST",
				body,
			}),
			invalidatesTags: ["Disponibilidad"],
		}),
		eliminarDisponibilidadPasada: builder.mutation<
			{ eliminados: number; ids: string[] },
			void
		>({
			query: () => ({
				url: "/disponibilidad/eliminar-pasada",
				method: "POST",
			}),
			invalidatesTags: ["Disponibilidad"],
		}),
		eliminarDisponibilidadPorCriterios: builder.mutation<
			{ eliminados: number; ids: string[] },
			{ id_especialista?: string; fecha_desde?: string; fecha_hasta?: string; hora_desde?: string; hora_hasta?: string }
		>({
			query: (body) => ({
				url: "/disponibilidad/eliminar-por-criterios",
				method: "POST",
				body,
			}),
			invalidatesTags: ["Disponibilidad"],
		}),
	}),
	overrideExisting: false,
});

const {
	useGetDisponibilidadPublicaQuery,
	useGetDisponibilidadPublicaPorEcoQuery,
	useGetDisponibilidadPorFechaQuery,
	useGetDisponibilidadPendientesQuery,
	useGetDisponibilidadAdminQuery,
	useCrearSolicitudMacroMutation,
	useCrearSolicitudMacroManualMutation,
	useAprobarSolicitudMacroMutation,
	useRechazarSolicitudMacroMutation,
	useAprobarDisponibilidadMutation,
	useAprobarDisponibilidadLoteMutation,
	useAprobarDisponibilidadPorCriteriosMutation,
	useRechazarDisponibilidadMutation,
	useCancelarDisponibilidadAdminMutation,
	useCancelarDisponibilidadLoteMutation,
	useEliminarDisponibilidadPasadaMutation,
	useEliminarDisponibilidadPorCriteriosMutation,
} = disponibilidadApi;

export {
	disponibilidadApi,
	useGetDisponibilidadPublicaQuery,
	useGetDisponibilidadPublicaPorEcoQuery,
	useGetDisponibilidadPorFechaQuery,
	useGetDisponibilidadPendientesQuery,
	useGetDisponibilidadAdminQuery,
	useCrearSolicitudMacroMutation,
	useCrearSolicitudMacroManualMutation,
	useAprobarSolicitudMacroMutation,
	useRechazarSolicitudMacroMutation,
	useAprobarDisponibilidadMutation,
	useAprobarDisponibilidadLoteMutation,
	useAprobarDisponibilidadPorCriteriosMutation,
	useRechazarDisponibilidadMutation,
	useCancelarDisponibilidadAdminMutation,
	useCancelarDisponibilidadLoteMutation,
	useEliminarDisponibilidadPasadaMutation,
	useEliminarDisponibilidadPorCriteriosMutation,
};
