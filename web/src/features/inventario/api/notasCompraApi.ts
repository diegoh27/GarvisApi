import { baseApi } from "../../../app/api/baseApi";

// ==========================================
// TIPOS
// ==========================================

export type NotaCompraLinea = {
	id_detalle: string;
	id_nota_compra: string;
	id_producto: string;
	producto_nombre?: string;
	cantidad: number;
	precio_unitario: number;
	precio_total: number;
	creado_en: string;
};

export type NotaCompra = {
	id_nota_compra: string;
	id_proveedor: string;
	proveedor_nombre?: string;
	numero_factura: string | null;
	fecha_compra: string;
	subtotal: number;
	impuesto: number;
	total: number;
	monto_usd: number;
	monto_bs: number;
	tasa_dia_bcv: number;
	observaciones: string | null;
	id_usuario: string;
	creado_en: string;
	total_lineas?: number;
	descripcion_productos?: string;
	lineas?: NotaCompraLinea[];
};

export type CreateNotaCompraPayload = {
	id_proveedor: string;
	numero_factura?: string;
	fecha_compra: string;
	observaciones?: string;
	lineas: {
		id_producto: string;
		cantidad: number;
		precio_unitario: number;
	}[];
};

const notasCompraApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		// GET /notas-compra - listar todas
		getNotasCompra: builder.query<NotaCompra[], void>({
			query: () => ({
				url: "/notas-compra",
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: NotaCompra[] }) =>
				response.data,
			providesTags: ["NotasCompra"],
		}),

		// GET /notas-compra/:id - obtener con detalle
		getNotaCompra: builder.query<NotaCompra, string>({
			query: (id) => ({
				url: `/notas-compra/${id}`,
				method: "GET",
			}),
			transformResponse: (response: { ok: boolean; data: NotaCompra }) =>
				response.data,
			providesTags: (_, __, arg) => [{ type: "NotasCompra", id: arg }],
		}),

		// POST /notas-compra - crear (con stock + kardex)
		createNotaCompra: builder.mutation<NotaCompra, CreateNotaCompraPayload>({
			query: (payload) => ({
				url: "/notas-compra",
				method: "POST",
				body: payload,
			}),
			transformResponse: (response: { ok: boolean; data: NotaCompra }) =>
				response.data,
			invalidatesTags: [
				"NotasCompra",
				"Productos",
				"InventarioAuditoria",
			],
		}),

		// DELETE /notas-compra/:id - eliminar (revierte stock)
		deleteNotaCompra: builder.mutation<{ message: string }, string>({
			query: (id) => ({
				url: `/notas-compra/${id}`,
				method: "DELETE",
			}),
			invalidatesTags: [
				"NotasCompra",
				"Productos",
				"InventarioAuditoria",
			],
		}),
	}),
	overrideExisting: false,
});

export const {
	useGetNotasCompraQuery,
	useGetNotaCompraQuery,
	useCreateNotaCompraMutation,
	useDeleteNotaCompraMutation,
} = notasCompraApi;

export { notasCompraApi };
