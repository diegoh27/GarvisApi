import { baseApi } from "../../app/api/baseApi";

export type PagoGuardado = {
	id_guardado: string;
	id_paciente: string;
	alias: string | null;
	banco_origen: string;
	cedula_pagador: string;
	telefono_pagador: string;
	creado_en: string;
};

const pagosGuardadosApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getPagosGuardados: builder.query<PagoGuardado[], string>({
			query: (id_paciente) => `/pagos-guardados/${id_paciente}`,
			transformResponse: (response: { ok: boolean; data: PagoGuardado[] }) =>
				response.data ?? [],
			providesTags: ["PagosGuardados"] as any,
		}),

		deletePagoGuardado: builder.mutation<{ ok: boolean }, string>({
			query: (id_guardado) => ({
				url: `/pagos-guardados/${id_guardado}`,
				method: "DELETE",
			}),
			invalidatesTags: ["PagosGuardados"] as any,
		}),
	}),
	overrideExisting: false,
});

export const {
	useGetPagosGuardadosQuery,
	useDeletePagoGuardadoMutation,
} = pagosGuardadosApi;

export { pagosGuardadosApi };
