import { baseApi } from "../../app/api/baseApi";
import type { DisponibilidadPendiente } from "../disponibilidad/disponibilidadApi";
import type { CitaPendientePago } from "../citas/citasApi";


// DisponibilidadPendiente ya incluye fecha, hora_inicio, hora_fin, estado
export type DisponibilidadConFecha = DisponibilidadPendiente;

// CitaPendientePago ya incluye fecha_cita, hora_cita
export type CitaConFecha = CitaPendientePago;

export type PagoData = {
	id_pago: string;
	id_cita: string;
	id_paciente: string;
	metodo: "Transferencia" | "PagoMovil";
	imagen: string;
	banco_origen: string;
	banco_destino: string;
	monto: number | string;
	cedula_pagador: string;
	telefono_pagador: string;
	referencia: string;
	estado_pago: number;
	fecha_pago: string;
	fecha_validacion: string | null;
	validado_por: string | null;
	validado_por_nombre?: string | null;
	validado_por_apellido?: string | null;
	paciente_rif?: string | null;
	paciente_cedula?: string | null;
	eco_precio?: number | string | null;
	eco_nombre?: string | null;
	/** Tasa BCV del día al registrar el pago (Bs. por USD) */
	tasa_dia_bcv?: number | string | null;
};

export type CitaData = {
	id_cita: string;
	id_paciente: string;
	id_representado: string | null;
	id_especialista: string;
	id_eco: string;
	fecha_cita: string;
	hora_cita: string;
	estado_cita: number;
	estado_pago: number;
	id_disponibilidad: string | null;
	orden: string;
	creada_en: string;
	// Datos del paciente
	paciente_nombre: string;
	paciente_apellido: string;
	paciente_cedula: string;
	paciente_telefono: string;
	paciente_correo: string | null;
	paciente_fecha_nacimiento: string | null;
	paciente_tipo_sangre: string | null;
	paciente_rif: string | null;
	paciente_contacto_nombre: string | null;
	paciente_contacto_telefono: string | null;
	// Datos del especialista
	especialista_nombre: string;
	especialista_apellido: string;
	especialista_cedula: string;
	especialista_telefono: string;
	especialista_correo: string | null;
	especialista_codigo_colegiatura: string | null;
	especialidad_nombre: string;
	// Datos del eco
	eco_nombre: string;
	eco_precio: number | string | null;
	eco_duracion_min: number | null;
	// Datos del representado (si existe)
	representado_nombre: string | null;
	representado_apellido: string | null;
	representado_cedula: string | null;
	representado_fecha_nacimiento: string | null;
	representado_parentesco: string | null;
	// Datos del pago (si existe)
	pago_id_pago: string | null;
	pago_metodo: "Transferencia" | "PagoMovil" | null;
	pago_imagen: string | null;
	pago_banco_origen: string | null;
	pago_banco_destino: string | null;
	pago_monto: number | string | null;
	pago_cedula_pagador: string | null;
	pago_telefono_pagador: string | null;
	pago_referencia: string | null;
	pago_estado_pago: number | null;
	pago_fecha_pago: string | null;
	pago_fecha_validacion: string | null;
	pago_validado_por: string | null;
	pago_validado_por_nombre: string | null;
	pago_validado_por_apellido: string | null;
};

export type PacienteData = {
	id_paciente: string;
	nombre: string;
	apellido: string;
	genero: string;
	cedula: string;
	correo: string;
	telefono: string;
	activo: number;
	fecha_nacimiento: string;
	tipo_sangre: string | null;
	descripcion: string | null;
	direccion: string | null;
	contacto_emergencia_nombre: string | null;
	contacto_emergencia_telefono: string | null;
};

export type EspecialistaData = {
	id_especialista: string;
	nombre: string;
	apellido: string;
	activo: number;
	id_especialidad: string;
	especialidad: string;
};

/** Cuerpo de POST /pacientes (creación por personal autorizado). */
export type CrearPacientePayload = {
	nombre: string;
	apellido: string;
	genero: "Masculino" | "Femenino" | "Otro";
	cedula: string;
	correo: string;
	telefono: string;
	contrasena: string;
	fecha_nacimiento: string;
	tipo_sangre: string;
	descripcion: string;
	direccion?: string;
	rif?: string;
	contacto_emergencia_nombre?: string;
	contacto_emergencia_telefono?: string;
};

const moderadoresApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		createPaciente: builder.mutation<
			{ ok: boolean; message: string; data: unknown },
			CrearPacientePayload
		>({
			query: (body) => ({
				url: "/pacientes",
				method: "POST",
				body,
			}),
			invalidatesTags: ["Pacientes"],
		}),
		getAllPacientes: builder.query<PacienteData[], void>({
			query: () => "/pacientes",
			transformResponse: (response: { ok: boolean; data: PacienteData[] }) =>
				response.data ?? [],
			providesTags: ["Pacientes"],
		}),
		getAllEspecialistas: builder.query<EspecialistaData[], void>({
			query: () => "/medicos",
			transformResponse: (response: { ok: boolean; data: EspecialistaData[] }) =>
				response.data ?? [],
			providesTags: ["Usuarios"],
		}),
		asignarCitaCompleta: builder.mutation<
			{
				id_cita: string;
				id_pago: string;
				id_resultado: string;
				id_paciente: string;
				id_especialista: string;
				id_eco: string;
				fecha_cita: string;
				hora_cita: string;
				monto: number;
				eco_precio: number;
			},
			{
				id_paciente: string;
				id_representado?: string | null;
				id_eco: string;
				id_especialista: string;
				id_disponibilidad: string;
				orden_medica?: string; // URL de la orden médica subida
				metodo: "Transferencia" | "PagoMovil";
				imagen?: string;
				banco_origen: string;
				banco_destino: string;
				monto: number;
				cedula_pagador: string;
				telefono_pagador: string;
				referencia: string;
			}
		>({
			query: (body) => ({
				url: "/citas/asignar",
				method: "POST",
				body,
			}),
			invalidatesTags: ["Citas", "Pacientes", "Disponibilidad"],
		}),
		getDisponibilidadesByFecha: builder.query<DisponibilidadConFecha[], string>({
			query: (fecha) => ({
				url: "/disponibilidad/por-fecha",
				params: { fecha },
			}),
			transformResponse: (response: { ok: boolean; data: DisponibilidadConFecha[] }) =>
				response.data ?? [],
			providesTags: ["Disponibilidad"],
		}),
		getDisponibilidadesByEspecialista: builder.query<
			DisponibilidadConFecha[],
			string
		>({
			query: (id_especialista) => ({
				url: "/disponibilidad/por-especialista",
				params: { id_especialista },
			}),
			transformResponse: (response: { ok: boolean; data: DisponibilidadConFecha[] }) =>
				response.data ?? [],
			providesTags: ["Disponibilidad"],
		}),
		getCitasByFecha: builder.query<CitaConFecha[], string>({
			query: (fecha) => ({
				url: "/citas/por-fecha",
				params: { fecha },
			}),
			transformResponse: (response: { ok: boolean; data: CitaConFecha[] }) =>
				response.data ?? [],
			providesTags: ["Citas"],
		}),
		getPagoByCita: builder.query<PagoData, string>({
			query: (id_cita) => ({
				url: `/pagos/cita/${id_cita}`,
			}),
			transformResponse: (response: { ok: boolean; data: PagoData }) => response.data,
			providesTags: ["Citas"],
		}),
		getCitaById: builder.query<CitaData, string>({
			query: (id_cita) => ({
				url: `/citas/${id_cita}`,
			}),
			transformResponse: (response: { ok: boolean; data: CitaData }) => response.data,
			providesTags: ["Citas"],
		}),
		getAllInformes: builder.query<
			Array<{
				id_informe: string;
				id_cita: string;
				id_especialista: string;
				reseña: string | null;
				recomendaciones: string | null;
				firma_url: string | null;
				informe_pdf_url: string | null;
				fecha_creacion: string | Date;
				fecha_actualizacion: string | Date | null;
				fecha_cita: string | Date;
				hora_cita: string;
				estado_cita: number;
				paciente_nombre: string;
				paciente_apellido: string;
				especialista_nombre: string;
				especialista_apellido: string;
				eco_nombre: string;
			}>,
			void
		>({
			query: () => "/informes/todos",
			transformResponse: (response: {
				ok: boolean;
				data: Array<{
					id_informe: string;
					id_cita: string;
					id_especialista: string;
					reseña: string | null;
					recomendaciones: string | null;
					firma_url: string | null;
					informe_pdf_url: string | null;
					fecha_creacion: string | Date;
					fecha_actualizacion: string | Date | null;
					fecha_cita: string | Date;
					hora_cita: string;
					estado_cita: number;
					paciente_nombre: string;
					paciente_apellido: string;
					paciente_cedula: string;
					especialista_nombre: string;
					especialista_apellido: string;
					eco_nombre: string;
				}>;
			}) => response.data ?? [],
			providesTags: ["Informes"],
		}),
		getCitasAtendidasSinInforme: builder.query<
			Array<{
				id_cita: string;
				fecha_cita: string | Date;
				hora_cita: string;
				estado_cita: number;
				paciente_nombre: string;
				paciente_apellido: string;
				paciente_cedula: string;
				especialista_nombre: string;
				especialista_apellido: string;
				eco_nombre: string;
			}>,
			void
		>({
			query: () => "/informes/pendientes",
			transformResponse: (response: {
				ok: boolean;
				data: Array<{
					id_cita: string;
					fecha_cita: string | Date;
					hora_cita: string;
					estado_cita: number;
					paciente_nombre: string;
					paciente_apellido: string;
					paciente_cedula: string;
					especialista_nombre: string;
					especialista_apellido: string;
					eco_nombre: string;
				}>;
			}) => response.data ?? [],
			providesTags: ["Informes"],
		}),
		recordarEspecialista: builder.mutation<
			{ ok: boolean; message: string },
			{ id_cita: string }
		>({
			query: ({ id_cita }) => ({
				url: `/informes/pendientes/${id_cita}/recordar`,
				method: "POST",
			}),
		}),
	}),
	overrideExisting: false,
});

export const {
	useCreatePacienteMutation,
	useGetAllPacientesQuery,
	useGetAllEspecialistasQuery,
	useAsignarCitaCompletaMutation,
	useGetDisponibilidadesByFechaQuery,
	useGetDisponibilidadesByEspecialistaQuery,
	useGetCitasByFechaQuery,
	useGetPagoByCitaQuery,
	useGetCitaByIdQuery,
	useGetAllInformesQuery,
	useGetCitasAtendidasSinInformeQuery,
	useRecordarEspecialistaMutation,
} = moderadoresApi;

export { moderadoresApi };
