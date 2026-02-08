import { baseApi } from "../../app/api/baseApi";

export type CrearEspecialistaPayload = {
	nombre: string;
	apellido: string;
	genero: "Masculino" | "Femenino" | "Otro";
	cedula: string;
	correo: string;
	telefono: string;
	contrasena: string;
	fecha_nacimiento: string;
	id_especialidad: string;
	porcentaje: number;
	codigo_colegiatura?: string;
	id_ecos?: string[]; // Array de IDs de ecos
};

export type CrearModeradorPayload = {
	nombre: string;
	apellido: string;
	correo: string;
	contrasena: string;
	genero: "Masculino" | "Femenino" | "Otro";
	cedula: string;
	telefono: string;
	fecha_nacimiento: string;
};

const adminApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		crearEspecialista: builder.mutation<
			{
				id_usuario: string;
				id_especialista: string;
				nombre: string;
				apellido: string;
				correo: string;
				telefono: string;
				id_especialidad: string;
			},
			CrearEspecialistaPayload
		>({
			query: (body) => ({
				url: "/medicos",
				method: "POST",
				body,
			}),
		}),
		crearModerador: builder.mutation<
			{
				id_usuario: string;
				nombre: string;
				apellido: string;
				correo: string;
				telefono: string;
			},
			CrearModeradorPayload
		>({
			query: (body) => ({
				url: "/moderadores",
				method: "POST",
				body,
			}),
			transformResponse: (response: { ok: boolean; data: any }) => {
				return response.data;
			},
			invalidatesTags: ["Usuarios"],
		}),
	}),
	overrideExisting: false,
});

export const { useCrearEspecialistaMutation, useCrearModeradorMutation } = adminApi;
