import { baseApi } from "../../app/api/baseApi";
import type { ApiResponse, Informe, CrearInformePayload } from "./types";

const informesApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getMisInformes: builder.query<Informe[], void>({
			query: () => "/informes",
			transformResponse: (response: ApiResponse<Informe[]>) =>
				response.data ?? [],
			providesTags: ["Informes"],
		}),
		getInformeByCita: builder.query<Informe | null, string>({
			query: (id_cita) => `/informes/cita/${id_cita}`,
			transformResponse: (response: ApiResponse<Informe> | null) => {
				// El backend devuelve 404 cuando no existe informe; mapear a `null` en frontend
				if (!response || !response.ok) return null;
				return response.data ?? null;
			},
			providesTags: (_result, _error, id_cita) => [
				{ type: "Informes", id: id_cita },
			],
		}),
		createOrUpdateInforme: builder.mutation<Informe, CrearInformePayload>({
			query: (body) => ({
				url: "/informes",
				method: "POST",
				body,
			}),
			invalidatesTags: (_result, _error, arg) => [
				"Informes",
				{ type: "Informes", id: arg.id_cita },
				"Citas", // También invalidar citas para actualizar la columna de informe
			],
		}),
	}),
});

const {
	useGetMisInformesQuery,
	useGetInformeByCitaQuery,
	useCreateOrUpdateInformeMutation,
} = informesApi;

export {
	informesApi,
	useGetMisInformesQuery,
	useGetInformeByCitaQuery,
	useCreateOrUpdateInformeMutation,
};
export type { CrearInformePayload };
