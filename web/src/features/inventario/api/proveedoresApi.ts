import { baseApi } from "../../../app/api/baseApi";

// ==========================================
// TIPOS
// ==========================================

export type Proveedor = {
	id_proveedor: string;
	nombre: string;
	rif: string | null;
	telefono: string | null;
	correo: string | null;
	direccion: string | null;
	contacto_nombre: string | null;
	activo: number;
	creado_en: string;
	actualizado_en: string | null;
};

export type CreateProveedorPayload = {
	nombre: string;
	rif?: string;
	telefono?: string;
	correo?: string;
	direccion?: string;
	contacto_nombre?: string;
	activo?: number;
};

export type UpdateProveedorPayload = Partial<CreateProveedorPayload>;

export type RelacionCatalogo = {
	id_relacion: string;
	id_proveedor: string;
	id_producto: string;
	precio_costo: string | number;
	fecha_actualizacion: string;
	producto_nombre: string;
	producto_categoria?: string;
	proveedor_nombre?: string;
};

const proveedoresApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		// GET /proveedores - listar todos
		getProveedores: builder.query<Proveedor[], void>({
			query: () => ({
				url: "/proveedores",
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: Proveedor[] }) =>
				response.data,
			providesTags: ["Proveedores"],
		}),

		// GET /proveedores/:id - obtener uno
		getProveedor: builder.query<Proveedor, string>({
			query: (id) => ({
				url: `/proveedores/${id}`,
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: Proveedor }) =>
				response.data,
			providesTags: (_, __, arg) => [{ type: "Proveedores", id: arg }],
		}),

		// POST /proveedores - crear
		createProveedor: builder.mutation<Proveedor, CreateProveedorPayload>({
			query: (payload) => ({
				url: "/proveedores",
				method: "POST",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; data: Proveedor }) =>
				response.data,
			invalidatesTags: ["Proveedores", "InventarioAuditoria"],
		}),

		// PATCH /proveedores/:id - actualizar
		updateProveedor: builder.mutation<
			Proveedor,
			{ id: string; payload: UpdateProveedorPayload }
		>({
			query: ({ id, payload }) => ({
				url: `/proveedores/${id}`,
				method: "PATCH",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; data: Proveedor }) =>
				response.data,
			invalidatesTags: (_, __, arg) => [
				"Proveedores",
				{ type: "Proveedores", id: arg.id },
				"InventarioAuditoria",
			],
		}),

		// DELETE /proveedores/:id - eliminar
		deleteProveedor: builder.mutation<{ message: string }, string>({
			query: (id) => ({
				url: `/proveedores/${id}`,
				method: "DELETE",
			}),
			invalidatesTags: ["Proveedores", "InventarioAuditoria"],
		}),

		// ==========================================
		// CATÁLOGO
		// ==========================================

		getProveedorCatalogo: builder.query<RelacionCatalogo[], string>({
			query: (id) => ({
				url: `/proveedores/${id}/catalogo`,
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: RelacionCatalogo[] }) =>
				response.data,
			providesTags: (_, __, arg) => [{ type: "ProveedorCatalogo", id: arg }],
		}),

		getCatalogoGlobal: builder.query<RelacionCatalogo[], void>({
			query: () => ({
				url: `/proveedores/catalogo-global`,
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: RelacionCatalogo[] }) =>
				response.data,
			// Usar TAG global si aplica, o proveedors y catalogo
			providesTags: ["ProveedorCatalogo"],
		}),

		asociarProductoCatalogo: builder.mutation<
			RelacionCatalogo,
			{ id_proveedor: string; id_producto: string; precio_costo: string | number }
		>({
			query: ({ id_proveedor, ...body }) => ({
				url: `/proveedores/${id_proveedor}/catalogo`,
				method: "POST",
				body,
			}),
			invalidatesTags: (_, __, arg) => [{ type: "ProveedorCatalogo", id: arg.id_proveedor }],
		}),

		updateCostoCatalogo: builder.mutation<
			RelacionCatalogo,
			{ id_proveedor: string; id_relacion: string; precio_costo: string | number }
		>({
			query: ({ id_proveedor, id_relacion, precio_costo }) => ({
				url: `/proveedores/${id_proveedor}/catalogo/${id_relacion}`,
				method: "PATCH",
				body: { precio_costo },
			}),
			invalidatesTags: (_, __, arg) => [{ type: "ProveedorCatalogo", id: arg.id_proveedor }],
		}),

		deleteProductoCatalogo: builder.mutation<{ message: string }, { id_proveedor: string; id_relacion: string }>({
			query: ({ id_proveedor, id_relacion }) => ({
				url: `/proveedores/${id_proveedor}/catalogo/${id_relacion}`,
				method: "DELETE",
			}),
			invalidatesTags: (_, __, arg) => [{ type: "ProveedorCatalogo", id: arg.id_proveedor }],
		}),
	}),
	overrideExisting: false,
});

export const {
	useGetProveedoresQuery,
	useGetProveedorQuery,
	useCreateProveedorMutation,
	useUpdateProveedorMutation,
	useDeleteProveedorMutation,
	useGetCatalogoGlobalQuery,
	useGetProveedorCatalogoQuery,
	useAsociarProductoCatalogoMutation,
	useUpdateCostoCatalogoMutation,
	useDeleteProductoCatalogoMutation,
} = proveedoresApi;

export { proveedoresApi };
