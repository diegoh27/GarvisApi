import { baseApi } from "../../app/api/baseApi";

export type PermisosInventario = {
	productos: boolean;
	entes: boolean;
	nomina: boolean;
	alquiler: boolean;
	comisiones: boolean;
	facturacion: boolean;
};

/** Visibilidad de ítems del menú lateral para el rol moderador (el Home no forma parte de este objeto). */
export type PermisosMenuModerador = {
	calendario: boolean;
	todas_las_citas: boolean;
	verificacion_pagos: boolean;
	disponibilidad_pendientes: boolean;
	pacientes: boolean;
	subir_resultados: boolean;
	informes: boolean;
	inventario: boolean;
	finanzas: boolean;
	registrar_especialista: boolean;
	registrar_moderador: boolean;
	especialidades: boolean;
	ecos: boolean;
};

const defaultPermisosMenuModerador = (): PermisosMenuModerador => ({
	calendario: true,
	todas_las_citas: true,
	verificacion_pagos: true,
	disponibilidad_pendientes: true,
	pacientes: true,
	subir_resultados: true,
	informes: true,
	inventario: true,
	finanzas: true,
	registrar_especialista: true,
	registrar_moderador: true,
	especialidades: true,
	ecos: true,
});

const rolesApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getPermisosInventario: builder.query<PermisosInventario, void>({
			query: () => "/roles/permisos-inventario",
			providesTags: ["PermisosInventario"],
			transformResponse: (response: { ok: boolean; data: PermisosInventario }) =>
				response.data,
		}),
		getPermisosInventarioModerador: builder.query<PermisosInventario, void>({
			query: () => "/roles/permisos-inventario-moderador",
			providesTags: ["PermisosInventario"],
			transformResponse: (response: { ok: boolean; data: PermisosInventario }) =>
				response.data,
		}),
		updatePermisosInventarioModerador: builder.mutation<
			PermisosInventario,
			PermisosInventario
		>({
			query: (body) => ({
				url: "/roles/permisos-inventario-moderador",
				method: "PUT",
				body,
			}),
			invalidatesTags: ["PermisosInventario"],
			transformResponse: (response: { ok: boolean; data: PermisosInventario }) =>
				response.data,
		}),
		getPermisosMenu: builder.query<PermisosMenuModerador, void>({
			query: () => "/roles/permisos-menu",
			providesTags: ["PermisosMenuModerador"],
			transformResponse: (response: { ok: boolean; data: PermisosMenuModerador }) =>
				response.data,
		}),
		getPermisosMenuModerador: builder.query<PermisosMenuModerador, void>({
			query: () => "/roles/permisos-menu-moderador",
			providesTags: ["PermisosMenuModerador"],
			transformResponse: (response: { ok: boolean; data: PermisosMenuModerador }) =>
				response.data,
		}),
		updatePermisosMenuModerador: builder.mutation<
			PermisosMenuModerador,
			PermisosMenuModerador
		>({
			query: (body) => ({
				url: "/roles/permisos-menu-moderador",
				method: "PUT",
				body,
			}),
			invalidatesTags: ["PermisosMenuModerador"],
			transformResponse: (response: { ok: boolean; data: PermisosMenuModerador }) =>
				response.data,
		}),
	}),
	overrideExisting: false,
});

export const {
	useGetPermisosInventarioQuery,
	useGetPermisosInventarioModeradorQuery,
	useUpdatePermisosInventarioModeradorMutation,
	useGetPermisosMenuQuery,
	useGetPermisosMenuModeradorQuery,
	useUpdatePermisosMenuModeradorMutation,
} = rolesApi;
export { rolesApi, defaultPermisosMenuModerador };
