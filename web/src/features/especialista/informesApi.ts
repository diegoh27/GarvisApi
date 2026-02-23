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

/**
 * Devuelve el informe por cita. El 404 (no existe informe) se trata como data: null
 * en lugar de error, para que la UI no muestre error cuando simplemente no hay informe.
 */
function useInformeByCita(
	id_cita: string,
	options?: { skip?: boolean },
) {
	const result = useGetInformeByCitaQuery(id_cita, {
		skip: options?.skip ?? !id_cita,
	});
	const is404 =
		result.isError &&
		"status" in (result.error ?? {}) &&
		(result.error as { status?: number }).status === 404;
	return {
		...result,
		data: is404 ? null : result.data ?? null,
		isError: result.isError && !is404,
		error: is404 ? undefined : result.error,
	};
}

export {
	informesApi,
	useGetMisInformesQuery,
	useGetInformeByCitaQuery,
	useInformeByCita,
	useCreateOrUpdateInformeMutation,
};
export type { CrearInformePayload };
