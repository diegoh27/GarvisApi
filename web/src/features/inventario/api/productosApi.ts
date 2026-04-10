import { baseApi } from "../../../app/api/baseApi";

// ==========================================
// TIPOS
// ==========================================

export type Producto = {
	id_producto: string;
	nombre: string;
	presentacion: string | null;
	categoria: string;
	unidad_compra: string;
	unidad_consumo: string;
	factor_conversion: number;
	stock_base_total: number;
	consumo_actual: number;
	stock_minimo_base: number;
	activo: number;
	creado_en: string;
	actualizado_en: string | null;
};

export type CompraProducto = {
	id_compra: string;
	id_producto: string;
	nombre_producto?: string;
	fecha_ingreso: string;
	cantidad: number;
	precio_unitario: number;
	precio_total: number;
	proveedor: string | null;
	referencia: string | null;
	id_usuario: string;
	creado_en: string;
};

export type AjusteStock = {
	id_ajuste: string;
	id_producto: string;
	nombre_producto?: string;
	fecha: string;
	stock_anterior: number;
	stock_nuevo: number;
	motivo: string | null;
	id_usuario: string;
	creado_en: string;
};

export type CreateProductoPayload = {
	nombre: string;
	presentacion?: string;
	categoria?: string;
	unidad_compra: string;
	unidad_consumo: string;
	factor_conversion: number;
	stock_base_total?: number;
	stock_minimo_base?: number;
	activo?: number;
};

export type ConsumoProducto = {
	id_consumo: string; // Used as the key
	id_cita: string;
	numero_cita?: number;
	id_producto?: string; // no longer specific per product in the list view
	nombre_producto: string; // now this is the aggregated string of products used
	cantidad: number; // total items
	fecha_consumo: string;
	paciente_nombre: string;
	paciente_apellido: string;
	especialista_nombre?: string;
	especialista_apellido?: string;
};

export type UpdateProductoPayload = {
	nombre?: string;
	presentacion?: string;
	categoria?: string;
	unidad_compra?: string;
	unidad_consumo?: string;
	factor_conversion?: number;
	stock_minimo_base?: number;
	activo?: number;
};

export type RegistrarCompraPayload = {
	fecha_ingreso: string;
	cantidad: number;
	precio_unitario: number;
	precio_total?: number;
	proveedor?: string;
	referencia?: string;
};

export type RegistrarAjustePayload = {
	stock_nuevo: number;
	motivo?: string;
};

const productosApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		// ==========================================
		// PRODUCTOS
		// ==========================================

		// GET /productos - listar todos los productos
		getProductos: builder.query<Producto[], void>({
			query: () => ({
				url: "/productos",
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: Producto[] }) =>
				response.data,
			providesTags: ["Productos"],
		}),

		// GET /productos/:id - obtener un producto
		getProducto: builder.query<Producto, string>({
			query: (id) => ({
				url: `/productos/${id}`,
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: Producto }) =>
				response.data,
			providesTags: (_, __, arg) => [{ type: "Productos", id: arg }],
		}),

		// POST /productos - crear producto
		createProducto: builder.mutation<Producto, CreateProductoPayload>({
			query: (payload) => ({
				url: "/productos",
				method: "POST",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; data: Producto }) =>
				response.data,
			invalidatesTags: ["Productos", "InventarioAuditoria"],
		}),

		// PATCH /productos/:id - actualizar producto
		updateProducto: builder.mutation<
			Producto,
			{ id: string; payload: UpdateProductoPayload }
		>({
			query: ({ id, payload }) => ({
				url: `/productos/${id}`,
				method: "PATCH",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; data: Producto }) =>
				response.data,
			invalidatesTags: (_, __, arg) => [
				"Productos",
				{ type: "Productos", id: arg.id },
				"InventarioAuditoria",
			],
		}),

		// DELETE /productos/:id - eliminar producto
		deleteProducto: builder.mutation<{ message: string }, string>({
			query: (id) => ({
				url: `/productos/${id}`,
				method: "DELETE",
			}),
			invalidatesTags: ["Productos", "InventarioAuditoria"],
		}),

		// ==========================================
		// COMPRAS
		// ==========================================

		// POST /productos/:id/compras - registrar compra
		registrarCompra: builder.mutation<
			CompraProducto,
			{ id: string; payload: RegistrarCompraPayload }
		>({
			query: ({ id, payload }) => ({
				url: `/productos/${id}/compras`,
				method: "POST",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; data: CompraProducto }) =>
				response.data,
			invalidatesTags: (_, __, arg) => [
				"Productos",
				{ type: "Productos", id: arg.id },
				"Compras",
				"HistorialCompras",
				"InventarioAuditoria",
			],
		}),

		// PUT /productos/compras/:idCompra - actualizar compra
		updateCompra: builder.mutation<
			CompraProducto,
			{ idCompra: string; payload: Partial<RegistrarCompraPayload> }
		>({
			query: ({ idCompra, payload }) => ({
				url: `/productos/compras/${idCompra}`,
				method: "PUT",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; data: CompraProducto }) =>
				response.data,
			invalidatesTags: [
				"Productos",
				"Compras",
				"HistorialCompras",
				"InventarioAuditoria",
			],
		}),

		// GET /productos/:id/compras - listar compras de un producto
		getComprasProducto: builder.query<CompraProducto[], string>({
			query: (id) => ({
				url: `/productos/${id}/compras`,
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: CompraProducto[] }) =>
				response.data,
			providesTags: (_, __, arg) => [{ type: "Compras", id: arg }],
		}),

		// GET /productos/compras/historial - historial de todas las compras
		getHistorialCompras: builder.query<CompraProducto[], void>({
			query: () => ({
				url: "/productos/compras/historial",
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: CompraProducto[] }) =>
				response.data,
			providesTags: ["HistorialCompras"],
		}),

		// DELETE /productos/compras/:idCompra - eliminar compra
		deleteCompra: builder.mutation<{ message: string }, string>({
			query: (idCompra) => ({
				url: `/productos/compras/${idCompra}`,
				method: "DELETE",
			}),
			invalidatesTags: [
				"Productos",
				"Compras",
				"HistorialCompras",
				"InventarioAuditoria",
			],
		}),

		// ==========================================
		// AJUSTES
		// ==========================================

		// POST /productos/:id/ajustes - registrar ajuste de stock
		registrarAjuste: builder.mutation<
			AjusteStock,
			{ id: string; payload: RegistrarAjustePayload }
		>({
			query: ({ id, payload }) => ({
				url: `/productos/${id}/ajustes`,
				method: "POST",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; data: AjusteStock }) =>
				response.data,
			invalidatesTags: (_, __, arg) => [
				"Productos",
				{ type: "Productos", id: arg.id },
				"Ajustes",
				"HistorialAjustes",
				"InventarioAuditoria",
			],
		}),

		// GET /productos/:id/ajustes - listar ajustes de un producto
		getAjustesProducto: builder.query<AjusteStock[], string>({
			query: (id) => ({
				url: `/productos/${id}/ajustes`,
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: AjusteStock[] }) =>
				response.data,
			providesTags: (_, __, arg) => [{ type: "Ajustes", id: arg }],
		}),

		// GET /productos/ajustes/historial - historial de todos los ajustes
		getHistorialAjustes: builder.query<AjusteStock[], void>({
			query: () => ({
				url: "/productos/ajustes/historial",
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: AjusteStock[] }) =>
				response.data,
			providesTags: ["HistorialAjustes"],
		}),

		// ==========================================
		// CONSUMOS
		// ==========================================

		// GET /productos/consumos/historial - historial de todos los consumos
		getHistorialConsumos: builder.query<ConsumoProducto[], void>({
			query: () => ({
				url: "/productos/consumos/historial",
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: ConsumoProducto[] }) =>
				response.data,
			// Using the general Productos tag since there's no specific consumos tag set
			providesTags: ["Productos"], 
		}),
	}),
	overrideExisting: false,
});

export const {
	useGetProductosQuery,
	useGetProductoQuery,
	useCreateProductoMutation,
	useUpdateProductoMutation,
	useDeleteProductoMutation,
	useRegistrarCompraMutation,
	useUpdateCompraMutation,
	useDeleteCompraMutation,
	useGetComprasProductoQuery,
	useGetHistorialComprasQuery,
	useRegistrarAjusteMutation,
	useGetAjustesProductoQuery,
	useGetHistorialAjustesQuery,
	useGetHistorialConsumosQuery,
} = productosApi;

export { productosApi };
