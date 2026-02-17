import { baseApi } from "../../app/api/baseApi";

export type PermisosInventario = {
	productos: boolean;
	entes: boolean;
	nomina: boolean;
	alquiler: boolean;
	comisiones: boolean;
	facturacion: boolean;
};

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
	}),
	overrideExisting: false,
});

export const {
	useGetPermisosInventarioQuery,
	useGetPermisosInventarioModeradorQuery,
	useUpdatePermisosInventarioModeradorMutation,
} = rolesApi;
export { rolesApi };
