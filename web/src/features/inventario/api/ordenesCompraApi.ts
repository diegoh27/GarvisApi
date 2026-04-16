import { baseApi } from "../../../app/api/baseApi";


export interface OrdenCompraDetalle {
	id_detalle?: string;
	id_orden?: string;
	id_producto: string;
	cantidad_ordenada: number;
	precio_unitario_acordado: number;
	subtotal?: number;
	producto_nombre?: string;
	presentacion?: string;
	unidad_compra?: string;
}

export interface OrdenCompra {
	id_orden: string;
	numero_orden: string;
	id_proveedor: string;
	fecha_emision: string;
	estado: "Pendiente" | "Recibida" | "Cancelada";
	total_estimado: number;
	total_con_iva?: number;
	num_productos?: number;
	total_unidades?: number;
	id_usuario: string;
	creado_en: string;
	proveedor_nombre?: string;
	proveedor_rif?: string;
	usuario_creador?: string;
	detalles?: OrdenCompraDetalle[];
}

export interface CreateOrdenCompraPayload {
	id_proveedor: string;
	fecha_emision: string;
	detalles: {
		id_producto: string;
		cantidad_ordenada: number;
		precio_unitario_acordado: number;
	}[];
}

export interface RecepcionOrdenPayload {
	id_orden: string;
	numero_factura?: string;
	fecha_compra: string;
	observaciones?: string;
	lineas: {
		id_producto: string;
		cantidad: number;
		precio_unitario: number;
	}[];
}

export const ordenesCompraApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getOrdenesCompra: builder.query<OrdenCompra[], void>({
			query: () => "/ordenes-compra",
			providesTags: ["OrdenesCompra"],
			transformResponse: (response: { ok: boolean; data: OrdenCompra[] }) => response.data,
		}),
		getOrdenCompraById: builder.query<OrdenCompra, string>({
			query: (id) => `/ordenes-compra/${id}`,
			providesTags: (_result, _error, id) => [{ type: "OrdenesCompra", id }],
			transformResponse: (response: { ok: boolean; data: OrdenCompra }) => response.data,
		}),
		createOrdenCompra: builder.mutation<OrdenCompra, CreateOrdenCompraPayload>({
			query: (payload) => ({
				url: "/ordenes-compra",
				method: "POST",
				body: payload,
			}),
			invalidatesTags: ["OrdenesCompra"],
			transformResponse: (response: { ok: boolean; data: OrdenCompra }) => response.data,
		}),
		procesarRecepcionOrden: builder.mutation<any, RecepcionOrdenPayload>({
			query: ({ id_orden, ...body }) => ({
				url: `/ordenes-compra/${id_orden}/recepcion`,
				method: "POST",
				body,
			}),
			invalidatesTags: ["OrdenesCompra", "Productos", "Kardex", "ProveedorCatalogo", "NotasCompra"],
			transformResponse: (response: { ok: boolean; data: any }) => response.data,
		}),
		cancelarOrdenCompra: builder.mutation<{ message: string }, string>({
			query: (id_orden) => ({
				url: `/ordenes-compra/${id_orden}/cancelar`,
				method: "PATCH",
			}),
			invalidatesTags: ["OrdenesCompra"],
		}),
	}),
	overrideExisting: false,
});

export const {
	useGetOrdenesCompraQuery,
	useGetOrdenCompraByIdQuery,
	useCreateOrdenCompraMutation,
	useProcesarRecepcionOrdenMutation,
	useCancelarOrdenCompraMutation
} = ordenesCompraApi;
