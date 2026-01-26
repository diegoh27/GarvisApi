import { baseApi } from "../../app/api/baseApi";

export type Especialidad = {
	id_especialidad: string;
	nombre: string;
};

const especialidadesApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getEspecialidades: builder.query<Especialidad[], void>({
			query: () => "/especialidades",
			transformResponse: (response: { ok: boolean; data: Especialidad[] }) =>
				response.data ?? [],
			providesTags: ["Especialidades"],
		}),
		createEspecialidad: builder.mutation<
			{ id_especialidad: string; nombre: string },
			{ nombre: string }
		>({
			query: (body) => ({
				url: "/especialidades",
				method: "POST",
				body,
			}),
			invalidatesTags: ["Especialidades"],
		}),
		updateEspecialidad: builder.mutation<
			{ updated: number; id_especialidad: string; nombre: string },
			{ id_especialidad: string; nombre: string }
		>({
			query: ({ id_especialidad, nombre }) => ({
				url: `/especialidades/${id_especialidad}`,
				method: "PUT",
				body: { nombre },
			}),
			invalidatesTags: ["Especialidades"],
		}),
		deleteEspecialidad: builder.mutation<
			{ deleted: number; id_especialidad: string },
			string
		>({
			query: (id) => ({
				url: `/especialidades/${id}`,
				method: "DELETE",
			}),
			invalidatesTags: ["Especialidades"],
		}),
	}),
	overrideExisting: false,
});

export const {
	useGetEspecialidadesQuery,
	useCreateEspecialidadMutation,
	useUpdateEspecialidadMutation,
	useDeleteEspecialidadMutation,
} = especialidadesApi;

export { especialidadesApi };
