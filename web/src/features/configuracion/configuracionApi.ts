import { baseApi } from "../../app/api/baseApi";

export type PerfilData = {
	nombre?: string;
	apellido?: string;
	genero?: string | null;
	correo?: string;
	cedula?: string;
	telefono?: string;
	especialidad?: string;
	fecha_nacimiento?: string | null;
	tipo_sangre?: string | null;
	descripcion?: string | null;
	direccion?: string | null;
	contacto_emergencia_nombre?: string | null;
	contacto_emergencia_telefono?: string | null;
};

export type PerfilRol = "paciente" | "especialista" | "moderador" | "admin";

export type UpdatePerfilPayload = {
	nombre?: string;
	apellido?: string;
	genero?: string;
	cedula?: string;
	correo?: string;
	fecha_nacimiento?: string;
	telefono?: string;
	contrasena?: string;
	tipo_sangre?: string;
	descripcion?: string;
	direccion?: string;
	contacto_emergencia_nombre?: string;
	contacto_emergencia_telefono?: string;
};

function getPerfilEndpoint(rol: PerfilRol): string {
	switch (rol) {
		case "especialista":
			return "/medicos/mi-perfil";
		case "paciente":
			return "/pacientes/mi-perfil";
		case "moderador":
			return "/moderadores/mi-perfil";
		case "admin":
			return "/users/mi-perfil";
		default:
			return "/users/mi-perfil";
	}
}

const configuracionApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getPerfil: builder.query<PerfilData, PerfilRol>({
			query: (rol) => getPerfilEndpoint(rol),
			transformResponse: (response: { ok: boolean; data: PerfilData }) =>
				response.data ?? ({} as PerfilData),
			providesTags: ["Perfil"],
		}),
		updatePerfil: builder.mutation<unknown, { rol: PerfilRol; payload: UpdatePerfilPayload }>({
			query: ({ rol, payload }) => ({
				url: getPerfilEndpoint(rol),
				method: "PATCH",
				body: payload,
			}),
			invalidatesTags: ["Perfil"],
		}),
	}),
});

export const { useGetPerfilQuery, useUpdatePerfilMutation } = configuracionApi;
export { configuracionApi };
