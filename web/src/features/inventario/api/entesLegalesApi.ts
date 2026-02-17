import { baseApi } from "../../../app/api/baseApi";

// ==========================================
// TIPOS
// ==========================================

/**
 * Ente Legal - Organismo (SENIAT, IVSS, etc.)
 */
export type EnteLegal = {
	id_ente: string;
	nombre: string;
	activo: number;
	cant_obligaciones: number;
	creado_en: string;
	actualizado_en: string | null;
};

/**
 * Obligación - Una obligación específica de un ente (IVA, ISLR, etc.)
 */
export type Obligacion = {
	id_obligacion: string;
	id_ente: string;
	nombre_ente: string;
	concepto: string;
	periodo: "Mensual" | "Trimestral" | "Semestral" | "Anual" | "Unico";
	fecha_vencimiento: string | null;
	monto: number | null;
	estado: "Pendiente" | "Pagado" | "Vencido";
	recordatorio_dias: number;
	creado_en: string;
	actualizado_en: string | null;
};

export type HistorialEnteLegal = {
	id_historial: string;
	id_ente: string;
	nombre_ente?: string;
	concepto?: string;
	precio_unitario: number;
	fecha_ingreso: string;
	creado_en: string;
};

export type CreateEntePayload = {
	nombre_ente: string;
};

export type UpdateEntePayload = {
	nombre_ente: string;
};

export type CreateObligacionPayload = {
	id_ente: string;
	concepto: string;
	periodo: string;
	fecha_vencimiento?: string;
	monto?: number;
	estado?: string;
	recordatorio_dias?: number;
};

export type UpdateObligacionPayload = {
	id_ente?: string;
	concepto?: string;
	periodo?: string;
	fecha_vencimiento?: string;
	monto?: number;
	estado?: string;
	recordatorio_dias?: number;
};

export type RegistrarPagoEntePayload = {
	monto: number;
	fecha_pago: string;
	fecha_proxima_vencimiento: string;
	metodo?: string;
	referencia?: string;
};

export type RegistrarPagoObligacionPayload = {
	monto: number;
	fecha_pago: string;
	fecha_proxima_vencimiento: string;
	metodo?: string;
	referencia?: string;
};

const entesLegalesApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		// ==========================================
		// ENTES LEGALES
		// ==========================================

		// GET /entes-legales - listar todos los entes legales
		getEntesLegales: builder.query<EnteLegal[], void>({
			query: () => ({
				url: "/entes-legales",
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: EnteLegal[] }) =>
				response.data,
			providesTags: ["EntesLegales"],
		}),

		// GET /entes-legales/:id - obtener un ente legal
		getEnteLegal: builder.query<EnteLegal, string>({
			query: (id) => ({
				url: `/entes-legales/${id}`,
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: EnteLegal }) =>
				response.data,
			providesTags: (_, __, arg) => [{ type: "EntesLegales", id: arg }],
		}),

		// POST /entes-legales - crear ente legal
		createEnteLegal: builder.mutation<EnteLegal, CreateEntePayload>({
			query: (payload) => ({
				url: "/entes-legales",
				method: "POST",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; data: EnteLegal }) =>
				response.data,
			invalidatesTags: ["EntesLegales"],
		}),

		// PATCH /entes-legales/:id - actualizar ente legal
		updateEnteLegal: builder.mutation<
			EnteLegal,
			{ id: string; payload: UpdateEntePayload }
		>({
			query: ({ id, payload }) => ({
				url: `/entes-legales/${id}`,
				method: "PATCH",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; data: EnteLegal }) =>
				response.data,
			invalidatesTags: (_, __, arg) => [
				"EntesLegales",
				{ type: "EntesLegales", id: arg.id },
			],
		}),

		// DELETE /entes-legales/:id - eliminar ente legal
		deleteEnteLegal: builder.mutation<void, string>({
			query: (id) => ({
				url: `/entes-legales/${id}`,
				method: "DELETE",
			}),
			invalidatesTags: (_, __, arg) => [
				"EntesLegales",
				{ type: "EntesLegales", id: arg },
			],
		}),

		// ==========================================
		// OBLIGACIONES
		// ==========================================

		// GET /obligaciones - listar todas las obligaciones
		getObligaciones: builder.query<Obligacion[], void>({
			query: () => ({
				url: "/obligaciones",
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: Obligacion[] }) =>
				response.data,
			providesTags: ["Obligaciones"],
		}),

		// GET /obligaciones/:id - obtener una obligación
		getObligacion: builder.query<Obligacion, string>({
			query: (id) => ({
				url: `/obligaciones/${id}`,
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: Obligacion }) =>
				response.data,
			providesTags: (_, __, arg) => [{ type: "Obligaciones", id: arg }],
		}),

		// POST /obligaciones - crear obligación
		createObligacion: builder.mutation<Obligacion, CreateObligacionPayload>({
			query: (payload) => ({
				url: "/obligaciones",
				method: "POST",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; data: Obligacion }) =>
				response.data,
			invalidatesTags: ["Obligaciones", "EntesLegales"],
		}),

		// PATCH /obligaciones/:id - actualizar obligación
		updateObligacion: builder.mutation<
			Obligacion,
			{ id: string; payload: UpdateObligacionPayload }
		>({
			query: ({ id, payload }) => ({
				url: `/obligaciones/${id}`,
				method: "PATCH",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; data: Obligacion }) =>
				response.data,
			invalidatesTags: (_, __, arg) => [
				"Obligaciones",
				{ type: "Obligaciones", id: arg.id },
			],
		}),

		// DELETE /obligaciones/:id - eliminar obligación
		deleteObligacion: builder.mutation<void, string>({
			query: (id) => ({
				url: `/obligaciones/${id}`,
				method: "DELETE",
			}),
			invalidatesTags: (_, __, arg) => [
				"Obligaciones",
				{ type: "Obligaciones", id: arg },
			],
		}),

		// POST /obligaciones/:id/pagar - registrar pago de obligación
		registrarPagoObligacion: builder.mutation<
			any,
			{ id: string; payload: RegistrarPagoObligacionPayload }
		>({
			query: ({ id, payload }) => ({
				url: `/obligaciones/${id}/pagar`,
				method: "POST",
				body: payload,
			}),
			invalidatesTags: (_, __, arg) => [
				"Obligaciones",
				"EntesLegales",
				"HistorialEnteLegal",
				{ type: "Obligaciones", id: arg.id },
			],
		}),

		// PUT /obligaciones/pagos/:idPago - actualizar pago de obligación
		updatePagoObligacion: builder.mutation<
			any,
			{ idPago: string; payload: Partial<RegistrarPagoObligacionPayload> }
		>({
			query: ({ idPago, payload }) => ({
				url: `/obligaciones/pagos/${idPago}`,
				method: "PUT",
				body: payload,
			}),
			invalidatesTags: ["Obligaciones", "EntesLegales", "HistorialEnteLegal"],
		}),

		// ==========================================
		// ENTES LEGALES - EXTRAS
		// ==========================================

		// GET /entes-legales:id/historial - historial de cambios de un ente legal
		getHistorialEnteLegal: builder.query<HistorialEnteLegal[], string>({
			query: (id) => ({
				url: `/entes-legales/${id}/historial`,
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: HistorialEnteLegal[] }) =>
				response.data,
			providesTags: (_, __, arg) => [
				{ type: "HistorialEnteLegal", id: arg },
			],
		}),

		// GET /entes-legales/pagos/historial - historial de pagos de todos los entes
		getHistorialPagosEntes: builder.query<HistorialEnteLegal[], void>({
			query: () => ({
				url: "/entes-legales/pagos/historial",
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: HistorialEnteLegal[] }) =>
				response.data,
			providesTags: ["HistorialEnteLegal"],
		}),

		// POST /entes-legales/:id/pagos - registrar pago de un ente
		registrarPagoEnteLegal: builder.mutation<
			HistorialEnteLegal,
			{ id: string; payload: RegistrarPagoEntePayload }
		>({
			query: ({ id, payload }) => ({
				url: `/entes-legales/${id}/pagos`,
				method: "POST",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; data: HistorialEnteLegal }) =>
				response.data,
			invalidatesTags: (_, __, arg) => [
				"HistorialEnteLegal",
				"EntesLegales",
				{ type: "EntesLegales", id: arg.id },
			],
		}),

		// DELETE /entes-legales/pagos/:idPago - eliminar pago de ente legal
		deletePagoEnteLegal: builder.mutation<{ message: string }, string>({
			query: (idPago) => ({
				url: `/entes-legales/pagos/${idPago}`,
				method: "DELETE",
			}),
			invalidatesTags: ["HistorialEnteLegal", "EntesLegales"],
		}),
	}),
	overrideExisting: false,
});

export const {
	useGetEntesLegalesQuery,
	useGetEnteLegalQuery,
	useCreateEnteLegalMutation,
	useUpdateEnteLegalMutation,
	useDeleteEnteLegalMutation,
	useGetObligacionesQuery,
	useGetObligacionQuery,
	useCreateObligacionMutation,
	useUpdateObligacionMutation,
	useDeleteObligacionMutation,
	useRegistrarPagoObligacionMutation,
	useUpdatePagoObligacionMutation,
	useGetHistorialEnteLegalQuery,
	useGetHistorialPagosEntesQuery,
	useRegistrarPagoEnteLegalMutation,
	useDeletePagoEnteLegalMutation,
} = entesLegalesApi;

export { entesLegalesApi };
