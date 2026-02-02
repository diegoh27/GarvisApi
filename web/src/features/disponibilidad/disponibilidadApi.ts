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

const disponibilidadApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getDisponibilidadPublica: builder.query<unknown, DisponibilidadPublicaParams | void>({
			query: (params) => ({
				url: "/disponibilidad/publica",
				params: params ?? undefined,
			}),
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
		}),
		getDisponibilidadPendientes: builder.query<DisponibilidadPendiente[], void>({
			query: () => "/disponibilidad/pendientes",
			transformResponse: (response: { ok: boolean; data: DisponibilidadPendiente[] }) =>
				response.data ?? [],
			providesTags: ["Disponibilidad"],
		}),
		aprobarDisponibilidad: builder.mutation<
			{ id_disponibilidad: string; estado: number },
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
			{ aprobados: number; ids: string[] },
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
			{ aprobados: number; ids: string[] },
			{ id_especialista?: string; fecha_desde?: string; fecha_hasta?: string; hora_desde?: string; hora_hasta?: string }
		>({
			query: (body) => ({
				url: "/disponibilidad/aprobar-por-criterios",
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
	useGetDisponibilidadPendientesQuery,
	useAprobarDisponibilidadMutation,
	useAprobarDisponibilidadLoteMutation,
	useAprobarDisponibilidadPorCriteriosMutation,
	useRechazarDisponibilidadMutation,
} = disponibilidadApi;

export {
	disponibilidadApi,
	useGetDisponibilidadPublicaQuery,
	useGetDisponibilidadPublicaPorEcoQuery,
	useGetDisponibilidadPendientesQuery,
	useAprobarDisponibilidadMutation,
	useAprobarDisponibilidadLoteMutation,
	useAprobarDisponibilidadPorCriteriosMutation,
	useRechazarDisponibilidadMutation,
};
