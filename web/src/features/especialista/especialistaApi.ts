import { baseApi } from "../../app/api/baseApi";
import type { ApiResponse, CitaEspecialista, Disponibilidad } from "./types";
import type { CitaData } from "../moderadores/moderadoresApi";

type CrearDisponibilidadPayload = {
	fecha: string;
	hora_inicio: string;
	hora_fin: string;
	id_eco?: string;
};

type BloqueBatch = {
	fecha: string;
	hora_inicio: string;
	hora_fin: string;
	id_eco?: string;
};

type CrearDisponibilidadBatchPayload = {
	bloques: BloqueBatch[];
};

const especialistaApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getMisCitas: builder.query<CitaEspecialista[], void>({
			query: () => "/citas/mi-especialista",
			transformResponse: (response: ApiResponse<CitaEspecialista[]>) =>
				response.data ?? [],
			providesTags: ["Citas"],
		}),
		getMisBloques: builder.query<Disponibilidad[], void>({
			query: () => "/disponibilidad/mis-bloques",
			transformResponse: (response: ApiResponse<Disponibilidad[]>) => {
				const rows = response.data ?? [];
				return rows.map((b) => ({
					...b,
					estado: Number(b.estado),
					estado_pago:
						b.estado_pago != null ? Number(b.estado_pago) : b.estado_pago,
					estado_cita:
						b.estado_cita != null ? Number(b.estado_cita) : b.estado_cita,
				})) as Disponibilidad[];
			},
			providesTags: ["Disponibilidad"],
		}),
		crearDisponibilidad: builder.mutation<void, CrearDisponibilidadPayload>({
			query: (body) => ({
				url: "/disponibilidad",
				method: "POST",
				body,
			}),
			invalidatesTags: ["Disponibilidad"],
		}),
		crearDisponibilidadBatch: builder.mutation<
			{ creados: number; ids: string[] },
			CrearDisponibilidadBatchPayload
		>({
			query: (body) => ({
				url: "/disponibilidad/batch",
				method: "POST",
				body,
			}),
			invalidatesTags: ["Disponibilidad"],
		}),
		cancelarDisponibilidad: builder.mutation<void, string>({
			query: (id) => {
				const clean = String(id ?? "").trim();
				return {
					url: `/disponibilidad/${encodeURIComponent(clean)}/cancelar`,
					method: "PATCH",
				};
			},
			invalidatesTags: ["Disponibilidad"],
		}),
		cancelarDisponibilidadMiLote: builder.mutation<
			{
				cancelados: number;
				ids: string[];
				reservados: string[];
				omitidos: string[];
				no_encontrados: string[];
			},
			{ ids: string[] }
		>({
			query: (body) => ({
				url: "/disponibilidad/cancelar-mi-lote",
				method: "POST",
				body,
			}),
			transformResponse: (response: {
				ok: boolean;
				data: {
					cancelados: number;
					ids: string[];
					reservados: string[];
					omitidos: string[];
					no_encontrados: string[];
				};
			}) => response.data,
			invalidatesTags: ["Disponibilidad"],
		}),
		marcarAtendida: builder.mutation<void, string>({
			query: (id) => ({
				url: `/citas/${id}/atender`,
				method: "PATCH",
			}),
			invalidatesTags: ["Citas"],
		}),
		getCitaById: builder.query<CitaData, string>({
			query: (id) => `/citas/${id}`,
			transformResponse: (response: ApiResponse<CitaData>) => response.data,
			providesTags: ["Citas"],
		}),
	}),
});

const {
	useGetMisCitasQuery,
	useGetMisBloquesQuery,
	useCrearDisponibilidadMutation,
	useCrearDisponibilidadBatchMutation,
	useCancelarDisponibilidadMutation,
	useCancelarDisponibilidadMiLoteMutation,
	useMarcarAtendidaMutation,
	useGetCitaByIdQuery,
} = especialistaApi;

export {
	especialistaApi,
	useGetMisCitasQuery,
	useGetMisBloquesQuery,
	useCrearDisponibilidadMutation,
	useCrearDisponibilidadBatchMutation,
	useCancelarDisponibilidadMutation,
	useCancelarDisponibilidadMiLoteMutation,
	useMarcarAtendidaMutation,
	useGetCitaByIdQuery,
};
export type { CrearDisponibilidadPayload, CrearDisponibilidadBatchPayload, BloqueBatch };
