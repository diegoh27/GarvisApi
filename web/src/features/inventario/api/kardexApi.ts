import { baseApi } from "../../../app/api/baseApi";

export interface KardexEntry {
	id_kardex: string;
	id_producto: string;
	producto_nombre: string;
	unidad_medida: string | null;
	tipo_movimiento: "ENTRADA" | "SALIDA" | "AJUSTE";
	cantidad: number;
	stock_anterior: number;
	stock_posterior: number;
	referencia_tipo: string | null;
	referencia_id: string | null;
	observaciones: string | null;
	usuario_nombre: string | null;
	usuario_apellido: string | null;
	creado_en: string;
}

export const kardexApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getKardex: builder.query<KardexEntry[], { id_producto?: string; limit?: number } | void>({
			query: (params) => ({
				url: "/kardex",
				params: params || {},
			}),
			transformResponse: (response: { ok: boolean; data: KardexEntry[] }) => response.data,
			providesTags: ["Kardex"],
		}),
	}),
});

export const { useGetKardexQuery } = kardexApi;
