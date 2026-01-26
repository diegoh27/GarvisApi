import { baseApi } from "../../app/api/baseApi";
import type { ApiResponse, CitaEspecialista, Disponibilidad } from "./types";
import type { CitaData } from "../moderadores/moderadoresApi";

type CrearDisponibilidadPayload = {
	fecha: string;
	hora_inicio: string;
	hora_fin: string;
	id_eco?: string;
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
			transformResponse: (response: ApiResponse<Disponibilidad[]>) =>
				response.data ?? [],
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
		cancelarDisponibilidad: builder.mutation<void, string>({
			query: (id) => ({
				url: `/disponibilidad/${id}/cancelar`,
				method: "PATCH",
			}),
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
	useCancelarDisponibilidadMutation,
	useMarcarAtendidaMutation,
	useGetCitaByIdQuery,
} = especialistaApi;

export {
	especialistaApi,
	useGetMisCitasQuery,
	useGetMisBloquesQuery,
	useCrearDisponibilidadMutation,
	useCancelarDisponibilidadMutation,
	useMarcarAtendidaMutation,
	useGetCitaByIdQuery,
};
export type { CrearDisponibilidadPayload };
