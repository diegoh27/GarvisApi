import { baseApi } from "../../app/api/baseApi";

export type Representado = {
	id_representado: string;
	id_paciente: string;
	nombre: string;
	apellido: string;
	cedula: string | null;
	fecha_nacimiento: string;
	genero: "Masculino" | "Femenino" | "Otro";
	parentesco: string | null;
};

export type ListRepresentadosParams = {
	page?: number;
	limit?: number;
	search?: string;
	parentesco?: string;
	genero?: string;
};

export type ListRepresentadosResponse = {
	data: Representado[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};

export type CreateRepresentadoPayload = {
	nombre: string;
	apellido: string;
	cedula?: string | null;
	fecha_nacimiento: string;
	genero: "Masculino" | "Femenino" | "Otro";
	parentesco?: string | null;
};

export type UpdateRepresentadoPayload = {
	id_representado: string;
	nombre: string;
	apellido: string;
	cedula?: string | null;
	fecha_nacimiento: string;
	genero: "Masculino" | "Femenino" | "Otro";
	parentesco?: string | null;
};

const representadosApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getRepresentados: builder.query<ListRepresentadosResponse, ListRepresentadosParams>({
			query: (params) => ({
				url: "/representados",
				params: {
					page: params.page ?? 1,
					limit: params.limit ?? 5,
					search: params.search?.trim() || undefined,
					parentesco: params.parentesco?.trim() || undefined,
					genero: params.genero || undefined,
				},
			}),
			transformResponse: (response: {
				ok: boolean;
				data: Representado[];
				total: number;
				page: number;
				limit: number;
				totalPages: number;
			}) => ({
				data: response.data ?? [],
				total: response.total ?? 0,
				page: response.page ?? 1,
				limit: response.limit ?? 5,
				totalPages: response.totalPages ?? 1,
			}),
			providesTags: ["Representados"],
		}),
		getParentescos: builder.query<string[], void>({
			query: () => "/representados/parentescos",
			transformResponse: (response: { ok: boolean; data: string[] }) =>
				response.data ?? [],
			providesTags: ["Representados"],
		}),
		createRepresentado: builder.mutation<Representado, CreateRepresentadoPayload>({
			query: (body) => ({
				url: "/representados",
				method: "POST",
				body,
			}),
			invalidatesTags: ["Representados"],
		}),
		updateRepresentado: builder.mutation<
			Representado,
			UpdateRepresentadoPayload
		>({
			query: ({ id_representado, ...body }) => ({
				url: `/representados/${id_representado}`,
				method: "PUT",
				body,
			}),
			invalidatesTags: ["Representados"],
		}),
		deleteRepresentado: builder.mutation<void, string>({
			query: (id_representado) => ({
				url: `/representados/${id_representado}`,
				method: "DELETE",
			}),
			invalidatesTags: ["Representados"],
		}),
	}),
	overrideExisting: false,
});

export const {
	useGetRepresentadosQuery,
	useGetParentescosQuery,
	useCreateRepresentadoMutation,
	useUpdateRepresentadoMutation,
	useDeleteRepresentadoMutation,
} = representadosApi;

export { representadosApi };
