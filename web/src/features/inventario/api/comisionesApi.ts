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
	/** Si la cita es para un representado, enviar para vincular al titular y que aparezca en Mis citas */
	id_paciente?: string;
	id_representado?: string;
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
			invalidatesTags: ["EspecialistaComision", "InventarioAuditoria"],
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
			invalidatesTags: ["EspecialistaComision", "InventarioAuditoria"],
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
			invalidatesTags: ["EspecialistaComision", "InventarioAuditoria"],
		}),

		// Eliminar pago de comisión (revertir a Pendiente y quitar de facturación)
		deletePagoComision: builder.mutation<{ message: string }, string>({
			query: (idComision) => ({
				url: `/comisiones-especialistas/${idComision}/pago`,
				method: "DELETE",
			}),
			invalidatesTags: ["EspecialistaComision", "Facturacion", "InventarioAuditoria"],
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

		// Crear o vincular paciente real desde mostrador
		crearPacienteMostrador: builder.mutation<
			{ ok: boolean; data: { id_paciente: string; existente: boolean; citaActiva: boolean; correo?: string } },
			{ cedula: string; nombre: string; apellido: string; telefono?: string; tipo_cedula?: string }
		>({
			query: (body) => ({
				url: "/citas/mostrador/crear-paciente",
				method: "POST",
				body,
			}),
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

		// Buscar representados por nombre/apellido (para menores sin cédula)
		buscarRepresentadoPorNombre: builder.query<
			Array<{
				id_representado: string;
				id_paciente: string;
				nombre: string;
				apellido: string;
				representado_cedula: string | null;
				titular_cedula: string;
				titular_nombre: string;
				titular_apellido: string;
			}>,
			{ nombre?: string; apellido?: string }
		>({
			query: ({ nombre = "", apellido = "" }) =>
				`/citas/mostrador/buscar-representado?nombre=${encodeURIComponent(nombre)}&apellido=${encodeURIComponent(apellido)}`,
			transformResponse: (
				response: { ok: boolean; data: Array<{
					id_representado: string;
					id_paciente: string;
					nombre: string;
					apellido: string;
					representado_cedula: string | null;
					titular_cedula: string;
					titular_nombre: string;
					titular_apellido: string;
				}> },
			) => response.data,
		}),

		// Datos por cédula: paciente registrado, representado y/o última cita de mostrador
		getDatosPorCedula: builder.query<
			{
				paciente: { id_paciente: string | null; nombre: string; apellido: string; cedula: string; telefono?: string; rif: string } | null;
				representado: { id_representado: string; id_paciente: string; nombre: string; apellido: string; cedula: string } | null;
				mostrador: { nombre: string; apellido: string; cedula: string; rif: string } | null;
				citaActiva: boolean;
			},
			string
		>({
			query: (cedula) =>
				`/citas/mostrador/datos-por-cedula?cedula=${encodeURIComponent(cedula)}`,
			transformResponse: (
				response: {
					ok: boolean;
					data: {
						paciente: { id_paciente: string | null; nombre: string; apellido: string; cedula: string; telefono?: string; rif: string } | null;
						representado: { id_representado: string; id_paciente: string; nombre: string; apellido: string; cedula: string } | null;
						mostrador: { nombre: string; apellido: string; cedula: string; rif: string } | null;
						citaActiva: boolean;
					};
				},
			) => response.data,
		}),

		// Horas ocupadas por un especialista en una fecha (bloques 20 min; para mostrador)
		getOcupacionEspecialista: builder.query<
			{ ocupados: string[]; libres: string[] },
			{ id_especialista: string; fecha: string }
		>({
			query: ({ id_especialista, fecha }) =>
				`/citas/ocupacion-especialista?id_especialista=${encodeURIComponent(id_especialista)}&fecha=${encodeURIComponent(fecha)}`,
			transformResponse: (response: { ok: boolean; data: { ocupados: string[]; libres: string[] } }) =>
				response.data,
		}),

		// Crear representado por cédula del titular (mostrador; admin/moderador). Si titular no existe, enviar nombre_titular y apellido_titular para darlo de alta y crear el representado.
		crearRepresentadoPorCedulaTitular: builder.mutation<
			{
				id_representado: string;
				id_paciente: string;
				nombre: string;
				apellido: string;
				cedula: string | null;
				fecha_nacimiento: string;
				genero: string;
				parentesco: string | null;
				titular_cedula: string;
				/** Presente cuando se dio de alta al titular en el mismo paso */
				titular_creado?: boolean;
				titular_nombre?: string;
				titular_apellido?: string;
			},
			{
				cedula_titular: string;
				nombre: string;
				apellido: string;
				cedula?: string | null;
				fecha_nacimiento: string;
				genero: "Masculino" | "Femenino";
				parentesco?: string | null;
				/** Si el titular no está registrado, enviar todos para darlo de alta y crear el representado en un solo paso */
				nombre_titular?: string;
				apellido_titular?: string;
				genero_titular?: "Masculino" | "Femenino";
				fecha_nacimiento_titular?: string;
			}
		>({
			query: (body) => ({
				url: "/representados/crear-por-cedula-titular",
				method: "POST",
				body,
			}),
			transformResponse: (
				response: {
					ok: boolean;
					data: {
						id_representado: string;
						id_paciente: string;
						nombre: string;
						apellido: string;
						cedula: string | null;
						fecha_nacimiento: string;
						genero: string;
						parentesco: string | null;
						titular_cedula: string;
						titular_creado?: boolean;
						titular_nombre?: string;
						titular_apellido?: string;
					};
				},
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
	useLazyGetDatosPorCedulaQuery,
	useLazyBuscarRepresentadoPorNombreQuery,
	useGetOcupacionEspecialistaQuery,
	useCrearRepresentadoPorCedulaTitularMutation,
	useCrearPacienteMostradorMutation,
} = comisionesApi;
