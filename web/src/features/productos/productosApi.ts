import { baseApi } from "../../app/api/baseApi";

export type ProductoListItem = {
	id_producto: string;
	nombre: string;
	unidad: string;
	stock_minimo: number;
	precio: number;
	activo: number;
	cantidad: number;
	fecha_ingreso: string | null;
	fecha_vencimiento: string | null;
};

export type CrearProductoPayload = {
	nombre: string;
	unidad: string;
	stock_minimo?: number;
	precio: number;
	activo?: boolean;
};

export type ActualizarProductoPayload = {
	id_producto: string;
	nombre?: string;
	unidad?: string;
	stock_minimo?: number;
	precio?: number;
	activo?: boolean;
};

export type GastoProductosParams = { desde: string; hasta: string };

export type GastoProductosResponse = {
	total: number;
	por_dia: Array<{ fecha: string; total: number; entradas: number }>;
};

export type ProductoLote = {
	id_lote: string;
	id_producto: string;
	cantidad: number;
	fecha_ingreso: string;
	fecha_vencimiento: string | null;
	costo_total: number | null;
};

export type ActualizarLotePayload = {
	id_producto: string;
	id_lote: string;
	cantidad?: number;
	fecha_ingreso?: string;
	fecha_vencimiento?: string | null;
	costo_total?: number | null;
};

export type HistorialLoteItem = {
	id_lote: string;
	id_producto: string;
	nombre_producto: string;
	cantidad: number;
	fecha_ingreso: string;
	fecha_vencimiento: string | null;
	costo_total: number | null;
};

const productosApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		listProductos: builder.query<ProductoListItem[], void>({
			query: () => "/productos",
			transformResponse: (response: { ok: boolean; data: ProductoListItem[] }) =>
				response.data ?? [],
			providesTags: ["Productos"],
		}),
		createProducto: builder.mutation<
			{ id_producto: string; nombre: string; unidad: string; stock_minimo: number; activo: number; precio: number },
			CrearProductoPayload
		>({
			query: (body) => ({
				url: "/productos",
				method: "POST",
				body,
			}),
			invalidatesTags: ["Productos"],
		}),
		createProductoLote: builder.mutation<
			{ id_lote: string; id_producto: string; cantidad: number; fecha_ingreso: string; fecha_vencimiento: string | null; costo_total: number | null },
			{ id_producto: string; cantidad: number; fecha_ingreso: string; fecha_vencimiento?: string; costo_total?: number }
		>({
			query: ({ id_producto, ...body }) => ({
				url: `/productos/${id_producto}/lotes`,
				method: "POST",
				body: {
					cantidad: body.cantidad,
					fecha_ingreso: body.fecha_ingreso,
					fecha_vencimiento: body.fecha_vencimiento,
					costo_total: body.costo_total,
				},
			}),
			invalidatesTags: ["Productos"],
		}),
		updateProducto: builder.mutation<
			{ id_producto: string; nombre: string; unidad: string; stock_minimo: number; activo: number; precio: number },
			ActualizarProductoPayload
		>({
			query: ({ id_producto, ...body }) => ({
				url: `/productos/${id_producto}`,
				method: "PATCH",
				body,
			}),
			invalidatesTags: ["Productos"],
		}),
		getGastoProductos: builder.query<GastoProductosResponse, GastoProductosParams>({
			query: ({ desde, hasta }) => `/productos/gasto?desde=${desde}&hasta=${hasta}`,
			transformResponse: (response: { ok: boolean; data: GastoProductosResponse }) =>
				response.data ?? { total: 0, por_dia: [] },
			providesTags: ["Productos"],
		}),
		listLotesByProducto: builder.query<ProductoLote[], string>({
			query: (id_producto) => `/productos/${id_producto}/lotes`,
			transformResponse: (response: { ok: boolean; data: ProductoLote[] }) =>
				response.data ?? [],
			providesTags: ["Productos"],
		}),
		updateProductoLote: builder.mutation<ProductoLote, ActualizarLotePayload>({
			query: ({ id_producto, id_lote, ...body }) => ({
				url: `/productos/${id_producto}/lotes/${id_lote}`,
				method: "PATCH",
				body,
			}),
			invalidatesTags: ["Productos"],
		}),
		getHistorialLotes: builder.query<HistorialLoteItem[], { limit?: number } | void>({
			query: (params) => {
				const limit = params && typeof params === "object" && params.limit != null ? params.limit : 100;
				return `/productos/historial-lotes?limit=${limit}`;
			},
			transformResponse: (response: { ok: boolean; data: HistorialLoteItem[] }) =>
				response.data ?? [],
			providesTags: ["Productos"],
		}),
	}),
	overrideExisting: false,
});

export const {
	useListProductosQuery,
	useCreateProductoMutation,
	useCreateProductoLoteMutation,
	useUpdateProductoMutation,
	useGetGastoProductosQuery,
	useListLotesByProductoQuery,
	useUpdateProductoLoteMutation,
	useGetHistorialLotesQuery,
} = productosApi;
export { productosApi };
