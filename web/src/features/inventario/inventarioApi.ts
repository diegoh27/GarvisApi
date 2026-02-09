// Este archivo se mantiene para backward compatibility
// Las APIs ahora están organizadas por dominio en la carpeta /api

export {
	// Productos
	type Producto,
	type CompraProducto,
	type AjusteStock,
	type CreateProductoPayload,
	type UpdateProductoPayload,
	type RegistrarCompraPayload,
	type RegistrarAjustePayload,
	useGetProductosQuery,
	useGetProductoQuery,
	useCreateProductoMutation,
	useUpdateProductoMutation,
	useRegistrarCompraMutation,
	useGetComprasProductoQuery,
	useGetHistorialComprasQuery,
	useRegistrarAjusteMutation,
	useGetAjustesProductoQuery,
	useGetHistorialAjustesQuery,
	productosApi,
	// Entes Legales
	type EnteLegal,
	type HistorialEnteLegal,
	type CreateEntePayload,
	type UpdateEntePayload,
	useGetEntesLegalesQuery,
	useGetEnteLegalQuery,
	useCreateEnteLegalMutation,
	useUpdateEnteLegalMutation,
	useDeleteEnteLegalMutation,
	useGetHistorialEnteLegalQuery,
	entesLegalesApi,
} from "./api";
