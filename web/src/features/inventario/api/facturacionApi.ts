import { baseApi } from "../../../app/api/baseApi";

export type FacturacionPeriodoResumen = {
	ingresos: number;
	egresos: number;
	balance: number;
	ingreso_operativo: number;
	egreso_operativo: number;
	neto_operativo: number;
	margen_operativo: number;
};

export type FacturacionResumen = {
	semanal: FacturacionPeriodoResumen;
	mensual: FacturacionPeriodoResumen;
	anual: FacturacionPeriodoResumen;
};

export type FacturacionMovimiento = {
	id_movimiento: string;
	tipo: "Ingreso" | "Egreso";
	fecha: string;
	monto: number;
	monto_total_dol: number;
	monto_total_bs: number;
	tasa_dia: number;
	monto_usd?: number;
	monto_bs?: number;
	tasa_dia_bcv?: number;
	descripcion: string | null;
	referencia: string | null;
	origen_modulo:
		| "CITA_PAGO"
		| "ESP_COMISION"
		| "INV_COMPRA"
		| "INV_AJUSTE"
		| "LEG_PAGO"
		| "NOM_PAGO"
		| "ALQ_PAGO"
		| "AJUSTE";
	origen_id: string | null;
	id_cita?: string | null;
	fecha_cita?: string | null;
	eco_nombre?: string | null;
	paciente_nombre?: string | null;
	paciente_cedula?: string | null;
	especialista_nombre?: string | null;
	especialista_apellido?: string | null;
	id_usuario: string;
	creado_en: string;
	usuario_nombre?: string | null;
	usuario_apellido?: string | null;
};

export type ListMovimientosFacturacionParams = {
	tipo?: "Ingreso" | "Egreso";
	origen_modulo?: FacturacionMovimiento["origen_modulo"];
	fecha_desde?: string;
	fecha_hasta?: string;
	q?: string;
	limit?: number;
	offset?: number;
};

export type ListMovimientosFacturacionResponse = {
	rows: FacturacionMovimiento[];
	total: number;
	limit: number;
	offset: number;
};

export const facturacionApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getResumenFacturacion: builder.query<FacturacionResumen, void>({
			query: () => "/facturacion/resumen",
			transformResponse: (response: { ok: boolean; data: FacturacionResumen }) =>
				response.data,
			providesTags: ["Facturacion"],
		}),

		listMovimientosFacturacion: builder.query<
			ListMovimientosFacturacionResponse,
			ListMovimientosFacturacionParams
		>({
			query: (params) => {
				const queryParams = new URLSearchParams();
				if (params.tipo) queryParams.append("tipo", params.tipo);
				if (params.origen_modulo)
					queryParams.append("origen_modulo", params.origen_modulo);
				if (params.fecha_desde)
					queryParams.append("fecha_desde", params.fecha_desde);
				if (params.fecha_hasta)
					queryParams.append("fecha_hasta", params.fecha_hasta);
				if (params.q) queryParams.append("q", params.q);
				if (params.limit)
					queryParams.append("limit", params.limit.toString());
				if (params.offset !== undefined)
					queryParams.append("offset", params.offset.toString());

				return `/facturacion/movimientos?${queryParams.toString()}`;
			},
			transformResponse: (response: {
				ok: boolean;
				data: ListMovimientosFacturacionResponse;
			}) => response.data,
			providesTags: ["Facturacion"],
		}),
	}),
});

export const {
	useGetResumenFacturacionQuery,
	useListMovimientosFacturacionQuery,
} = facturacionApi;
