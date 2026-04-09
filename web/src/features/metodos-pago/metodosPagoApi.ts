import { baseApi } from "../../app/api/baseApi";

/** Coincide con pagos.metodo y metodos_pago.tipo_pago en checkout */
export type MetodoPagoTipoCheckout =
	| "Transferencia"
	| "PagoMovil"
	| "EfectivoBs"
	| "EfectivoUSD"
	| "Zelle"
	| "Binance"
	| "PayPal"
	| "Otro"
	| "Efectivo";

export type MetodoPagoDisponible = {
	id_metodo_pago: string;
	nombre: string;
	banco_codigo: string;
	banco_nombre: string;
	tipo_pago: MetodoPagoTipoCheckout;
	moneda: "BS" | "USD" | string;
	titular_identificacion: string | null;
	telefono: string | null;
	numero_cuenta: string | null;
	imagen_url: string | null;
	activo: number;
};

const metodosPagoApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getMetodosPagoDisponibles: builder.query<MetodoPagoDisponible[], void>({
			query: () => "/metodos-pago/disponibles",
			transformResponse: (response: { ok: boolean; data: MetodoPagoDisponible[] }) =>
				response.data ?? [],
			keepUnusedDataFor: 300,
		}),
	}),
	overrideExisting: false,
});

export const { useGetMetodosPagoDisponiblesQuery } = metodosPagoApi;

export { metodosPagoApi };
