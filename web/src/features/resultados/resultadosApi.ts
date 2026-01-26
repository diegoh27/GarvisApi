import { baseApi } from "../../app/api/baseApi";

export type CitaSinResultado = {
	id_cita: string;
	id_paciente: string;
	id_especialista: string;
	id_eco: string;
	fecha_cita: string;
	hora_cita: string;
	estado_cita: number;
	paciente_nombre: string;
	paciente_apellido: string;
	especialista_nombre: string;
	especialista_apellido: string;
	eco_nombre: string;
	resultado_archivo: string | null;
};

export type CitaAtendidaConResultado = {
	id_cita: string;
	id_paciente: string;
	id_especialista: string;
	id_eco: string;
	fecha_cita: string;
	hora_cita: string;
	estado_cita: number;
	paciente_nombre: string;
	paciente_apellido: string;
	especialista_nombre: string;
	especialista_apellido: string;
	eco_nombre: string;
	resultado_archivo: string | null;
	resultado_estado: number | null;
};

const resultadosApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getCitasSinResultado: builder.query<CitaSinResultado[], void>({
			query: () => "/resultados/citas-sin-resultado",
			transformResponse: (response: { ok: boolean; data: CitaSinResultado[] }) =>
				response.data ?? [],
			providesTags: ["Citas"],
		}),
		getCitasAtendidasConResultados: builder.query<CitaAtendidaConResultado[], void>({
			query: () => "/resultados/citas-atendidas",
			transformResponse: (response: { ok: boolean; data: CitaAtendidaConResultado[] }) =>
				response.data ?? [],
			providesTags: ["Citas"],
		}),
		uploadResultado: builder.mutation<
			{
				id_resultado: string;
				id_cita: string;
				archivo: string;
				nombre: string | null;
				archivo_urls: string[]; // Array de URLs cuando son múltiples archivos
			},
			{ id_cita: string; archivos: File[]; nombre?: string }
		>({
			query: ({ id_cita, archivos, nombre }) => {
				const formData = new FormData();
				// Agregar todos los archivos con el mismo nombre de campo
				archivos.forEach((archivo) => {
					formData.append("archivos", archivo);
				});
				formData.append("id_cita", id_cita);
				if (nombre) {
					formData.append("nombre", nombre);
				}
				return {
					url: "/resultados/upload",
					method: "POST",
					body: formData,
				};
			},
			invalidatesTags: ["Citas"],
		}),
		deleteArchivoFromResultado: builder.mutation<
			{
				id_cita: string;
				archivo: string;
				archivos_restantes: number;
			},
			{ id_cita: string; archivo_url: string }
		>({
			query: ({ id_cita, archivo_url }) => ({
				url: `/resultados/${id_cita}/archivo`,
				method: "DELETE",
				body: { archivo_url },
			}),
			invalidatesTags: ["Citas"],
		}),
	}),
	overrideExisting: false,
});

export const {
	useGetCitasSinResultadoQuery,
	useGetCitasAtendidasConResultadosQuery,
	useUploadResultadoMutation,
	useDeleteArchivoFromResultadoMutation,
} = resultadosApi;

export { resultadosApi };
