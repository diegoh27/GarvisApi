import { baseApi } from "../../../app/api/baseApi";

// ==========================================
// TIPOS
// ==========================================

export type Empleado = {
	id_empleado: string;
	nombre: string;
	apellido: string | null;
	cedula: string | null;
	cargo: string;
	periodo: "Semanal" | "Quincenal" | "Mensual";
	sueldo: number;
	estado: "Activo" | "Inactivo";
	proximo_pago?: string | null;
	proximo_pago_manual?: string | null;
	estatus_pago_manual?: "Pendiente" | "Pagada" | null;
	estatus_pago?: "Pendiente" | "Pagada" | "Vencido";
	creado_en: string;
	actualizado_en: string | null;
};

export type NominaPago = {
	id_pago: string;
	id_empleado: string;
	nombre_empleado: string;
	apellido?: string;
	cargo?: string;
	monto: number;
	fecha_pago: string;
	fecha_proximo_pago?: string | null;
	metodo: "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro";
	referencia?: string;
	creado_en: string;
};

export type CreateEmpleadoPayload = {
	nombre: string;
	apellido?: string;
	cedula?: string;
	cargo: string;
	periodo?: "Semanal" | "Quincenal" | "Mensual";
	sueldo?: number;
};

export type UpdateEmpleadoPayload = {
	nombre?: string;
	apellido?: string;
	cedula?: string;
	cargo?: string;
	periodo?: "Semanal" | "Quincenal" | "Mensual";
	sueldo?: number;
	estado?: "Activo" | "Inactivo";
		proximo_pago_manual?: string | null;
		estatus_pago_manual?: "Pendiente" | "Pagada" | null;
};

export type UpdatePagoNominaPayload = {
	fecha_pago?: string;
	fecha_proximo_pago?: string;
	monto?: number;
	metodo?: "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro";
	referencia?: string;
};

export type RegistrarPagoNominaPayload = {
	fecha_pago: string;
	fecha_proximo_pago: string;
	monto: number;
	metodo?: "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro";
	referencia?: string;
};

// ==========================================
// API
// ==========================================

export const nominaApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		// ==========================================
		// EMPLEADOS
		// ==========================================
		getEmpleados: builder.query<Empleado[], void>({
			query: () => "/nomina/empleados",
			providesTags: ["Empleado"],
		}),

		getEmpleado: builder.query<Empleado, string>({
			query: (idEmpleado) => `/nomina/empleados/${idEmpleado}`,
			providesTags: ["Empleado"],
		}),

		createEmpleado: builder.mutation<Empleado, CreateEmpleadoPayload>({
			query: (payload) => ({
				url: "/nomina/empleados",
				method: "POST",
				body: payload,
			}),
			invalidatesTags: ["Empleado"],
		}),

		updateEmpleado: builder.mutation<
			Empleado,
			{ id: string; payload: UpdateEmpleadoPayload }
		>({
			query: ({ id, payload }) => ({
				url: `/nomina/empleados/${id}`,
				method: "PUT",
				body: payload,
			}),
			invalidatesTags: ["Empleado"],
		}),

		deleteEmpleado: builder.mutation<{ message: string }, string>({
			query: (idEmpleado) => ({
				url: `/nomina/empleados/${idEmpleado}`,
				method: "DELETE",
			}),
			invalidatesTags: ["Empleado"],
		}),

		// ==========================================
		// PAGOS
		// ==========================================
		getHistorialPagosNomina: builder.query<NominaPago[], void>({
			query: () => "/nomina/pagos/historial",
			providesTags: ["NominaPago"],
		}),

		getHistorialPagosEmpleado: builder.query<NominaPago[], string>({
			query: (idEmpleado) => `/nomina/empleados/${idEmpleado}/pagos`,
			providesTags: ["NominaPago"],
		}),

		registrarPagoNomina: builder.mutation<
			NominaPago,
			{ idEmpleado: string; payload: RegistrarPagoNominaPayload }
		>({
			query: ({ idEmpleado, payload }) => ({
				url: `/nomina/empleados/${idEmpleado}/pagos`,
				method: "POST",
				body: payload,
			}),
			invalidatesTags: ["NominaPago", "Empleado"],
		}),

		updatePagoNomina: builder.mutation<
			NominaPago,
			{ idPago: string; payload: UpdatePagoNominaPayload }
		>({
			query: ({ idPago, payload }) => ({
				url: `/nomina/pagos/${idPago}`,
				method: "PUT",
				body: payload,
			}),
			invalidatesTags: ["NominaPago", "Empleado"],
		}),

		deletePagoNomina: builder.mutation<{ message: string }, string>({
			query: (idPago) => ({
				url: `/nomina/pagos/${idPago}`,
				method: "DELETE",
			}),
			invalidatesTags: ["NominaPago", "Empleado"],
		}),
	}),
});

export const {
	useGetEmpleadosQuery,
	useGetEmpleadoQuery,
	useCreateEmpleadoMutation,
	useUpdateEmpleadoMutation,
	useDeleteEmpleadoMutation,
	useGetHistorialPagosNominaQuery,
	useGetHistorialPagosEmpleadoQuery,
	useRegistrarPagoNominaMutation,
	useUpdatePagoNominaMutation,
	useDeletePagoNominaMutation,
} = nominaApi;
