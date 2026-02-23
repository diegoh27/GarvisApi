import { baseApi } from "../../app/api/baseApi";

export type DolarOficial = {
	fuente: string;
	nombre: string;
	compra: number | null;
	venta: number | null;
	promedio: number;
	fechaActualizacion: string;
};

const dolarApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getDolarOficial: builder.query<DolarOficial, void>({
			query: () => "/dolar/oficial",
			transformResponse: (response: { ok: boolean; data: DolarOficial }) =>
				response.data,
			// Cache por 5 minutos (300 segundos)
			keepUnusedDataFor: 300,
		}),
	}),
	overrideExisting: false,
});

export const { useGetDolarOficialQuery } = dolarApi;

export { dolarApi };
