import { baseApi } from "../../app/api/baseApi";

export type Usuario = {
	id_usuario: string;
	nombre: string;
	apellido: string;
	genero: string;
	cedula: string;
	correo: string;
	telefono: string;
	activo: number;
	fecha_nacimiento: string | null;
	fecha_registro: string;
	rol: string;
	id_rol: string;
};

export type UpdateUsuarioPayload = {
	nombre?: string;
	apellido?: string;
	genero?: "Masculino" | "Femenino" | "Otro";
	cedula?: string;
	correo?: string;
	telefono?: string;
	fecha_nacimiento?: string;
};

export const usuariosApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		listUsers: builder.query<
			Usuario[],
			{ rol?: string; activo?: number; q?: string }
		>({
			query: (params) => ({
				url: "/users",
				params,
			}),
			transformResponse: (response: { ok: boolean; data: Usuario[] }) => {
				return response.data || [];
			},
			providesTags: ["Usuarios"],
		}),
		getUserById: builder.query<Usuario, string>({
			query: (id) => `/users/${id}`,
			transformResponse: (response: { ok: boolean; data: Usuario }) => {
				return response.data;
			},
			providesTags: ["Usuarios"],
		}),
		getEspecialistaById: builder.query<
			{
				id_especialista: string;
				nombre: string;
				apellido: string;
				id_especialidad: string;
				especialidad: string;
				codigo_colegiatura: string | null;
			},
			string
		>({
			query: (id) => `/medicos/${id}`,
			transformResponse: (response: { ok: boolean; data: any }) => {
				return response.data;
			},
			providesTags: ["Usuarios"],
		}),
		updateUser: builder.mutation<Usuario, { id: string; payload: UpdateUsuarioPayload }>({
			query: ({ id, payload }) => ({
				url: `/users/${id}`,
				method: "PUT",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; data: Usuario }) => {
				return response.data;
			},
			invalidatesTags: ["Usuarios"],
		}),
		setUserActive: builder.mutation<
			{ updated: number; id_usuario: string; activo: number },
			{ id: string; activo: number }
		>({
			query: ({ id, activo }) => ({
				url: `/users/${id}/estado`,
				method: "PATCH",
				body: { activo },
			}),
			invalidatesTags: ["Usuarios"],
		}),
		updateEspecialista: builder.mutation<
			{ updated: number; id_especialista: string },
			{
				id: string;
				payload: UpdateUsuarioPayload & {
					id_especialidad?: string;
					codigo_colegiatura?: string;
					id_ecos?: string[];
				};
			}
		>({
			query: ({ id, payload }) => ({
				url: `/medicos/${id}`,
				method: "PUT",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; data: any }) => {
				return response.data;
			},
			invalidatesTags: ["Usuarios", "Ecos"],
		}),
	}),
	overrideExisting: false,
});

export const {
	useListUsersQuery,
	useGetUserByIdQuery,
	useGetEspecialistaByIdQuery,
	useUpdateUserMutation,
	useUpdateEspecialistaMutation,
	useSetUserActiveMutation,
} = usuariosApi;
