import { baseApi } from "../../app/api/baseApi";

export type CitaPendientePago = {
	id_cita: string;
	id_paciente: string;
	id_representado: string | null;
	id_especialista: string;
	id_eco: string;
	origen_cita?: "web" | "mostrador";
	fecha_cita: string;
	hora_cita: string;
	estado_cita: number;
	estado_pago: number;
	id_disponibilidad: string;
	orden: string;
	paciente_nombre: string;
	paciente_apellido: string;
	paciente_cedula: string;
	paciente_telefono: string;
	especialista_nombre: string;
	especialista_apellido: string;
	eco_nombre: string;
	/** Desde `pagos` (listado ampliado); puede ser null si aún no hay fila de pago */
	pago_monto?: number | string | null;
	pago_metodo?: string | null;
};

export type CitaCompleta = {
	id_cita: string;
	id_paciente: string;
	id_representado: string | null;
	id_especialista: string;
	id_eco: string;
	origen_cita?: "web" | "mostrador";
	fecha_cita: string;
	hora_cita: string;
	estado_cita: number;
	estado_pago: number;
	id_disponibilidad: string;
	orden: string;
	creada_en: string;
	// Datos del paciente
	paciente_nombre: string;
	paciente_apellido: string;
	paciente_cedula: string;
	paciente_telefono: string;
	paciente_correo: string | null;
	// Datos del especialista
	especialista_nombre: string;
	especialista_apellido: string;
	especialista_cedula: string;
	especialista_telefono: string;
	especialista_codigo_colegiatura: string | null;
	especialidad_nombre: string;
	// Datos del eco
	eco_nombre: string;
	eco_precio: number | string;
	eco_duracion_min: number | null;
	// Datos del representado
	representado_nombre: string | null;
	representado_apellido: string | null;
	representado_cedula: string | null;
	representado_fecha_nacimiento: string | null;
	representado_parentesco: string | null;
	// Datos del resultado
	resultado_archivo: string | null;
	resultado_study_uid: string | null;
	resultado_estado: number | null;
	resultado_fecha_publicacion: string | null;
	// Datos del informe
	id_informe: string | null;
	informe_reseña: string | null;
	informe_recomendaciones: string | null;
	informe_pdf_url: string | null;
	informe_fecha_creacion: string | null;
	// Datos del pago
	id_pago: string | null;
	pago_metodo: string | null;
	pago_imagen: string | null;
	pago_banco_origen: string | null;
	pago_banco_destino: string | null;
	pago_monto: number | string | null;
	pago_cedula_pagador: string | null;
	pago_telefono_pagador: string | null;
	pago_referencia: string | null;
	pago_fecha_pago: string | null;
	pago_fecha_validacion: string | null;
	pago_validado_por: string | null;
	pago_validado_por_nombre: string | null;
	pago_validado_por_apellido: string | null;
};

export type CitaPacienteCompleta = {
	id_cita: string;
	id_paciente: string;
	id_representado: string | null;
	id_especialista: string;
	id_eco: string;
	fecha_cita: string;
	hora_cita: string;
	estado_cita: number;
	estado_pago: number;
	id_disponibilidad: string;
	orden: string;
	origen_cita?: "web" | "mostrador";
	es_vinculada_mostrador?: boolean;
	especialista_nombre: string;
	especialista_apellido: string;
	paciente_nombre: string;
	paciente_apellido: string;
	eco_nombre: string;
	/** Precio del eco en USD (para formulario de pago) */
	eco_precio?: number | string;
	// Datos del representado
	representado_nombre: string | null;
	representado_apellido: string | null;
	representado_cedula: string | null;
	representado_fecha_nacimiento: string | null;
	representado_genero: string | null;
	representado_parentesco: string | null;
	// Datos del resultado
	resultado_archivo: string | null;
	resultado_study_uid: string | null;
	resultado_estado: number | null;
	resultado_publicado: string | null;
	// Datos del informe
	id_informe: string | null;
	informe_pdf_url: string | null;
	// Datos del pago
	id_pago: string | null;
	pago_metodo: string | null;
	pago_imagen: string | null;
	pago_monto: number | string | null;
	pago_referencia: string | null;
	pago_estado_pago: number | null;
};

/** Cita de mostrador que aún no está vinculada a ninguna cuenta (para reclamar). */
export type CitaMostradorDisponible = {
	id_cita: string;
	fecha_cita: string;
	hora_cita: string;
	estado_cita: number;
	estado_pago: number;
	eco_nombre: string;
	paciente_nombre: string;
	paciente_apellido: string;
	paciente_cedula: string;
	especialista_nombre: string;
	especialista_apellido: string;
};

const citasApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getCitasPendientesPago: builder.query<CitaPendientePago[], void>({
			query: () => "/citas/pendientes-pago",
			transformResponse: (response: { ok: boolean; data: CitaPendientePago[] }) =>
				response.data ?? [],
			providesTags: ["Citas"],
		}),
		getVerificacionPagosKpi: builder.query<{ verificados_hoy: number }, void>({
			query: () => "/citas/verificacion-pagos-kpi",
			transformResponse: (response: { ok: boolean; data: { verificados_hoy: number } }) =>
				response.data ?? { verificados_hoy: 0 },
			providesTags: ["Citas"],
		}),
		getCitasConPagos: builder.query<CitaPendientePago[], void>({
			query: () => "/citas/con-pagos",
			transformResponse: (response: { ok: boolean; data: CitaPendientePago[] }) =>
				response.data ?? [],
			providesTags: ["Citas"],
		}),
		updateEstadoPago: builder.mutation<
			{ id_cita: string; estado_pago: number; estado_cita: number },
			{ id_cita: string; estado_pago: number; motivo_rechazo?: string }
		>({
			query: ({ id_cita, estado_pago, motivo_rechazo }) => ({
				url: `/citas/${id_cita}/estado-pago`,
				method: "PATCH",
				body: { estado_pago, motivo_rechazo },
			}),
			invalidatesTags: ["Citas"],
		}),
		cancelCita: builder.mutation<
			{ id_cita: string; estado_cita: number },
			string
		>({
			query: (id_cita) => ({
				url: `/citas/${id_cita}/cancelar`,
				method: "PATCH",
			}),
			invalidatesTags: ["Citas"],
		}),
		posponerCita: builder.mutation<
			{
				id_cita: string;
				fecha_cita: string;
				hora_cita: string;
				id_especialista?: string | null;
				id_disponibilidad?: string | null;
			},
			{
				id_cita: string;
				fecha_cita: string;
				hora_cita: string;
				id_especialista?: string;
				id_disponibilidad?: string;
			}
		>({
			query: ({ id_cita, fecha_cita, hora_cita, id_especialista, id_disponibilidad }) => ({
				url: `/citas/${id_cita}/posponer`,
				method: "PATCH",
				body: { fecha_cita, hora_cita, id_especialista, id_disponibilidad },
			}),
			invalidatesTags: ["Citas"],
		}),
		getAllCitas: builder.query<CitaCompleta[], void>({
			query: () => "/citas/todas",
			transformResponse: (response: { ok: boolean; data: CitaCompleta[] }) =>
				response.data ?? [],
			providesTags: ["Citas"],
		}),
		getMisCitasCompletas: builder.query<CitaPacienteCompleta[], void>({
			query: () => "/citas/mis-citas",
			transformResponse: (response: { ok: boolean; data: CitaPacienteCompleta[] }) => response.data ?? [],
			providesTags: ["Citas"],
		}),
		getTienePagoPendiente: builder.query<{ tienePagoPendiente: boolean }, void>({
			query: () => "/citas/tiene-pago-pendiente",
			transformResponse: (response: { ok: boolean; data: { tienePagoPendiente: boolean } }) =>
				response.data ?? { tienePagoPendiente: false },
			providesTags: ["Citas"],
		}),
		marcarAtendida: builder.mutation<{ id_cita: string; estado_cita: number }, string>({
			query: (id_cita) => ({
				url: `/citas/${id_cita}/atender`,
				method: "PATCH",
			}),
			invalidatesTags: ["Citas"],
		}),
		getCitasMostradorDisponiblesParaVincular: builder.query<
			CitaMostradorDisponible[],
			string
		>({
			query: (cedula) =>
				`/citas/mostrador/disponibles-vincular?cedula=${encodeURIComponent(cedula)}`,
			transformResponse: (response: { ok: boolean; data: CitaMostradorDisponible[] }) =>
				response.data ?? [],
			providesTags: ["Citas"],
		}),
		vincularCitasMostrador: builder.mutation<
			{ vinculadas: number; rechazadas: number; message?: string },
			{ id_citas: string[] }
		>({
			query: (body) => ({
				url: "/citas/mostrador/vincular",
				method: "POST",
				body,
			}),
			transformResponse: (response: {
				ok: boolean;
				data: { vinculadas: number; rechazadas: number; message?: string };
			}) => response.data,
			invalidatesTags: ["Citas"],
		}),
		asignarCita: builder.mutation<
			{ id_cita: string },
			{
				id_paciente: string;
				id_representado?: string;
				id_eco: string;
				id_especialista: string;
				id_disponibilidad: string;
				orden_medica?: string;
				metodo:
					| "Transferencia"
					| "PagoMovil"
					| "EfectivoBs"
					| "EfectivoUSD"
					| "Zelle"
					| "Binance"
					| "PayPal"
					| "Otro"
					| "Efectivo";
				imagen?: string;
				banco_origen?: string;
				banco_destino?: string;
				monto: number;
				cedula_pagador: string;
				telefono_pagador: string;
				referencia?: string;
			}
		>({
			query: (body) => ({
				url: "/citas/asignar",
				method: "POST",
				body,
			}),
			invalidatesTags: ["Citas", "Disponibilidad"],
		}),
		uploadOrdenMedica: builder.mutation<
			{ url: string },
			FormData
		>({
			query: (formData) => ({
				url: "/citas/upload-orden-medica",
				method: "POST",
				body: formData,
			}),
			transformResponse: (response: { ok: boolean; data: { url: string } }) =>
				response.data,
		}),
	}),
	overrideExisting: false,
});

export const {
	useGetCitasPendientesPagoQuery,
	useGetVerificacionPagosKpiQuery,
	useGetCitasConPagosQuery,
	useGetTienePagoPendienteQuery,
	useUpdateEstadoPagoMutation,
	useCancelCitaMutation,
	usePosponerCitaMutation,
	useGetAllCitasQuery,
	useGetMisCitasCompletasQuery,
	useMarcarAtendidaMutation,
	useLazyGetCitasMostradorDisponiblesParaVincularQuery,
	useVincularCitasMostradorMutation,
	useAsignarCitaMutation,
	useUploadOrdenMedicaMutation,
} = citasApi;

export { citasApi };
