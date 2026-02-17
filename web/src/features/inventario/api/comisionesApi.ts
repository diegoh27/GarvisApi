import { baseApi } from "../../../app/api/baseApi";

// ==========================================
// TIPOS
// ==========================================

export type EspecialistaComision = {
	id_comision: string;
	id_especialista: string;
	id_cita: string;
	especialista_nombre: string;
	especialista_apellido: string | null;
	paciente_nombre?: string | null;
	paciente_cedula?: string | null;
	paciente_rif?: string | null;
	porcentaje: number;
	monto: number;
	estado: "Pendiente" | "Pagada";
	fecha_creacion: string;
	fecha_pago: string | null;
	fecha_cita?: string;
	eco_nombre?: string;
	eco_precio?: number;
	empresa_paciente?: string | null;
	referencia_pago?: string | null;
	descripcion_pago?: string | null;
};

export type ComisionPago = {
	id_comision_pago: string;
	id_comision: string;
	id_especialista: string;
	nombre_especialista?: string;
	monto: number;
	fecha_pago: string;
	metodo?: "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro";
	referencia?: string;
	creado_en: string;
};

export type ListComisionesParams = {
	id_especialista?: string;
	estado?: "Pendiente" | "Pagada";
	limit?: number;
	offset?: number;
};

export type GenerarComisionesPayload = {
	id_especialista?: string;
};

export type PagarComisionPayload = {
	fecha_pago: string;
	metodo?: "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro";
	referencia?: string;
};

export type CrearCitaMostradorPayload = {
	id_especialista: string;
	id_eco: string;
	fecha_cita: string;
	hora_cita?: string;
	metodo: "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro";
	monto: number;
	tasa_dia_bcv: number;
	nombre: string;
	apellido: string;
	cedula: string;
	rif?: string;
	referencia?: string;
};

// ==========================================
// API
// ==========================================

export const comisionesApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		// Listar comisiones
		listComisiones: builder.query<EspecialistaComision[], ListComisionesParams>({
			query: (params) => {
				const queryParams = new URLSearchParams();
				if (params.id_especialista) queryParams.append("id_especialista", params.id_especialista);
				if (params.estado) queryParams.append("estado", params.estado);
				if (params.limit) queryParams.append("limit", params.limit.toString());
				if (params.offset) queryParams.append("offset", params.offset.toString());
				return `/comisiones-especialistas?${queryParams.toString()}`;
			},
			transformResponse: (response: { ok: boolean; data: EspecialistaComision[] }) => response.data,
			providesTags: ["EspecialistaComision"],
		}),

		// Obtener historial de comisiones pagadas
		getHistorialComisiones: builder.query<EspecialistaComision[], void>({
			query: () => "/comisiones-especialistas?estado=Pagada",
			transformResponse: (response: { ok: boolean; data: EspecialistaComision[] }) => response.data,
			providesTags: ["EspecialistaComision"],
		}),

		// Generar comisiones pendientes
		generarComisiones: builder.mutation<
			{ ok: boolean; message: string; data: { inserted: number } },
			GenerarComisionesPayload
		>({
			query: (payload) => ({
				url: "/comisiones-especialistas/generar",
				method: "POST",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; message: string; data: { inserted: number } }) => response,
			invalidatesTags: ["EspecialistaComision"],
		}),

		// Pagar comisión
		pagarComision: builder.mutation<
			{ ok: boolean; data: EspecialistaComision },
			{ idComision: string; payload: PagarComisionPayload }
		>({
			query: ({ idComision, payload }) => ({
				url: `/comisiones-especialistas/${idComision}/pagar`,
				method: "POST",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; data: EspecialistaComision }) => response,
			invalidatesTags: ["EspecialistaComision"],
		}),

		// Editar pago de comisión
		editarPagoComision: builder.mutation<
			{ ok: boolean; data: EspecialistaComision },
			{ idComision: string; payload: PagarComisionPayload }
		>({
			query: ({ idComision, payload }) => ({
				url: `/comisiones-especialistas/${idComision}/pago`,
				method: "PUT",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; data: EspecialistaComision }) => response,
			invalidatesTags: ["EspecialistaComision"],
		}),

		// Eliminar pago de comisión (revertir a Pendiente y quitar de facturación)
		deletePagoComision: builder.mutation<{ message: string }, string>({
			query: (idComision) => ({
				url: `/comisiones-especialistas/${idComision}/pago`,
				method: "DELETE",
			}),
			invalidatesTags: ["EspecialistaComision", "Facturacion"],
		}),

		crearCitaMostrador: builder.mutation<
			{
				ok: boolean;
				message: string;
				data: { id_cita: string; id_pago: string; id_comision: string; referencia: string; origen_cita: "mostrador" };
			},
			CrearCitaMostradorPayload
		>({
			query: (body) => ({
				url: "/citas/mostrador",
				method: "POST",
				body,
			}),
			invalidatesTags: ["EspecialistaComision", "Citas"],
		}),

		// Último paciente de mostrador por cédula (para rellenar nombre/apellido/rif en otra cita)
		getUltimoPacienteMostrador: builder.query<
			{ nombre: string; apellido: string; cedula: string; rif: string } | null,
			string
		>({
			query: (cedula) =>
				`/citas/mostrador/ultimo-paciente?cedula=${encodeURIComponent(cedula)}`,
			transformResponse: (
				response: { ok: boolean; data: { nombre: string; apellido: string; cedula: string; rif: string } | null },
			) => response.data,
		}),
	}),
});

export const {
	useListComisionesQuery,
	useGetHistorialComisionesQuery,
	useGenerarComisionesMutation,
	usePagarComisionMutation,
	useEditarPagoComisionMutation,
	useDeletePagoComisionMutation,
	useCrearCitaMostradorMutation,
	useLazyGetUltimoPacienteMostradorQuery,
} = comisionesApi;
