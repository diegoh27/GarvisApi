import { baseApi } from "../../app/api/baseApi";

export type Eco = {
	id_eco: string;
	nombre: string;
	precio: number;
	duracion_min: number;
	activo: number;
};

const ecosApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getEcos: builder.query<Eco[], void>({
			query: () => "/ecos",
			transformResponse: (response: { ok: boolean; data: Eco[] }) =>
				response.data ?? [],
			providesTags: ["Ecos"],
		}),
		getEcosByEspecialista: builder.query<Eco[], string>({
			query: (id_especialista) => `/especialista-ecos/${id_especialista}`,
			transformResponse: (response: { ok: boolean; data: Eco[] }) =>
				response.data ?? [],
			providesTags: ["Ecos"],
		}),
		createEco: builder.mutation<
			{ id_eco: string; nombre: string; precio: number; duracion_min: number },
			{ nombre: string; precio: number; duracion_min: number }
		>({
			query: (body) => ({
				url: "/ecos",
				method: "POST",
				body,
			}),
			invalidatesTags: ["Ecos"],
		}),
		updateEco: builder.mutation<
			{ updated: number; id_eco: string },
			{ id_eco: string; nombre?: string; precio?: number; duracion_min?: number; activo?: number }
		>({
			query: ({ id_eco, ...body }) => ({
				url: `/ecos/${id_eco}`,
				method: "PUT",
				body,
			}),
			invalidatesTags: ["Ecos"],
		}),
		deleteEco: builder.mutation<
			{ deleted: number; id_eco: string },
			string
		>({
			query: (id) => ({
				url: `/ecos/${id}`,
				method: "DELETE",
			}),
			invalidatesTags: ["Ecos"],
		}),
	}),
	overrideExisting: false,
});

export const {
	useGetEcosQuery,
	useGetEcosByEspecialistaQuery,
	useCreateEcoMutation,
	useUpdateEcoMutation,
	useDeleteEcoMutation,
} = ecosApi;

export { ecosApi };
