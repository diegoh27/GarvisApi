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
	resultado_study_uid: string | null;
};

export type CitaAtendidaConResultado = {
	id_cita: string;
	id_paciente: string;
	id_representado?: string | null;
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
	resultado_study_uid: string | null;
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
			transformResponse: (response: {
				ok: boolean;
				data: CitaAtendidaConResultado[];
			}) => response.data ?? [],
			providesTags: ["Citas"],
		}),
		getMisResultados: builder.query<CitaAtendidaConResultado[], void>({
			query: () => "/resultados/mis-resultados",
			transformResponse: (response: {
				ok: boolean;
				data: CitaAtendidaConResultado[];
			}) => response.data ?? [],
			providesTags: ["Citas"],
		}),

		// ── Subir archivos NO-DICOM (imágenes, PDF, videos, etc.) ──────────
		uploadResultado: builder.mutation<
			{
				id_resultado: string;
				id_cita: string;
				archivo: string;
				nombre: string | null;
				archivo_urls: string[];
			},
			{ id_cita: string; archivos: File[]; nombre?: string }
		>({
			query: ({ id_cita, archivos, nombre }) => {
				const formData = new FormData();
				archivos.forEach((archivo) => formData.append("archivos", archivo));
				formData.append("id_cita", id_cita);
				if (nombre) formData.append("nombre", nombre);
				return { url: "/resultados/upload", method: "POST", body: formData };
			},
			invalidatesTags: ["Citas"],
		}),

		// ── Subir estudio DICOM → Orthanc ───────────────────────────────────
		uploadDicomToOrthanc: builder.mutation<
			{
				id_resultado: string;
				id_cita: string;
				study_uid: string;
				ohif_url: string;
				updated: boolean;
			},
			{ id_cita: string; archivos: File[]; nombre?: string }
		>({
			query: ({ id_cita, archivos, nombre }) => {
				const formData = new FormData();
				archivos.forEach((archivo) => formData.append("archivos", archivo));
				formData.append("id_cita", id_cita);
				if (nombre) formData.append("nombre", nombre);
				return { url: "/orthanc/upload", method: "POST", body: formData };
			},
			invalidatesTags: ["Citas"],
		}),

		// ── Eliminar estudio DICOM de Orthanc ───────────────────────────────
		deleteDicomStudy: builder.mutation<
			{ ok: boolean; message: string },
			{ uid: string; id_cita: string }
		>({
			query: ({ uid, id_cita }) => ({
				url: `/orthanc/study/${uid}`,
				method: "DELETE",
				body: { id_cita },
			}),
			invalidatesTags: ["Citas"],
		}),

		// ── Eliminar un archivo individual (no-DICOM) ───────────────────────
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
	useGetMisResultadosQuery,
	useUploadResultadoMutation,
	useUploadDicomToOrthancMutation,
	useDeleteDicomStudyMutation,
	useDeleteArchivoFromResultadoMutation,
} = resultadosApi;

export { resultadosApi };
