import { baseApi } from "../../app/api/baseApi";

export type CitaPendientePago = {
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
	paciente_nombre: string;
	paciente_apellido: string;
	paciente_cedula: string;
	paciente_telefono: string;
	especialista_nombre: string;
	especialista_apellido: string;
	eco_nombre: string;
};

const citasApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getCitasPendientesPago: builder.query<CitaPendientePago[], void>({
			query: () => "/citas/pendientes-pago",
			transformResponse: (response: { ok: boolean; data: CitaPendientePago[] }) =>
				response.data ?? [],
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
			{ id_cita: string; estado_pago: number }
		>({
			query: ({ id_cita, estado_pago }) => ({
				url: `/citas/${id_cita}/estado-pago`,
				method: "PATCH",
				body: { estado_pago },
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
	}),
	overrideExisting: false,
});

export const {
	useGetCitasPendientesPagoQuery,
	useGetCitasConPagosQuery,
	useUpdateEstadoPagoMutation,
	useCancelCitaMutation,
} = citasApi;

export { citasApi };
