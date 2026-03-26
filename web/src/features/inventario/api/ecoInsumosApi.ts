import { baseApi } from "../../../app/api/baseApi";

// ==========================================
// TIPOS
// ==========================================

export type EcoConReceta = {
	id_eco: string;
	nombre: string;
	precio: number;
	duracion_min: number;
	activo: number;
	total_insumos: number;
	total_unidades: number;
};

export type EcoInsumo = {
	id_eco_insumo: string;
	id_eco: string;
	id_producto: string;
	producto_nombre: string;
	cantidad: number;
	stock_actual: number;
	creado_en: string;
};

export type StockValidation = {
	ok: boolean;
	insumos: {
		id_producto: string;
		producto_nombre: string;
		cantidad_requerida: number;
		stock_actual: number;
	}[];
	faltantes: {
		producto: string;
		requerido: number;
		disponible: number;
		faltante: number;
	}[];
};

const ecoInsumosApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		// GET /eco-insumos - todos los ecos con resumen de receta
		getEcosConReceta: builder.query<EcoConReceta[], void>({
			query: () => ({ url: "/eco-insumos", method: "GET" }),
			transformResponse: (r: { ok: boolean; data: EcoConReceta[] }) => r.data,
			providesTags: ["EcoInsumos", "Ecos"],
		}),

		// GET /eco-insumos/:idEco - insumos de un eco
		getInsumosEco: builder.query<EcoInsumo[], string>({
			query: (idEco) => ({ url: `/eco-insumos/${idEco}`, method: "GET" }),
			transformResponse: (r: { ok: boolean; data: EcoInsumo[] }) => r.data,
			providesTags: (_, __, arg) => [{ type: "EcoInsumos", id: arg }],
		}),

		// POST /eco-insumos/:idEco - agregar insumo a la receta
		addInsumoEco: builder.mutation<
			EcoInsumo,
			{ idEco: string; id_producto: string; cantidad: number }
		>({
			query: ({ idEco, ...body }) => ({
				url: `/eco-insumos/${idEco}`,
				method: "POST",
				body,
			}),
			transformResponse: (r: { ok: boolean; data: EcoInsumo }) => r.data,
			invalidatesTags: (_, __, arg) => [
				"EcoInsumos",
				{ type: "EcoInsumos", id: arg.idEco },
				"InventarioAuditoria",
			],
		}),

		// PATCH /eco-insumos/insumo/:idInsumo - actualizar cantidad
		updateInsumoEco: builder.mutation<
			{ id_eco_insumo: string; cantidad: number },
			{ idInsumo: string; cantidad: number; idEco?: string }
		>({
			query: ({ idInsumo, cantidad }) => ({
				url: `/eco-insumos/insumo/${idInsumo}`,
				method: "PATCH",
				body: { cantidad },
			}),
			invalidatesTags: (_, __, arg) => [
				"EcoInsumos",
				...(arg.idEco ? [{ type: "EcoInsumos" as const, id: arg.idEco }] : []),
				"InventarioAuditoria",
			],
		}),

		// DELETE /eco-insumos/insumo/:idInsumo - eliminar insumo
		deleteInsumoEco: builder.mutation<
			{ message: string },
			{ idInsumo: string; idEco?: string }
		>({
			query: ({ idInsumo }) => ({
				url: `/eco-insumos/insumo/${idInsumo}`,
				method: "DELETE",
			}),
			invalidatesTags: (_, __, arg) => [
				"EcoInsumos",
				...(arg.idEco ? [{ type: "EcoInsumos" as const, id: arg.idEco }] : []),
				"InventarioAuditoria",
			],
		}),

		// GET /eco-insumos/:idEco/validar-stock
		validarStockEco: builder.query<StockValidation, string>({
			query: (idEco) => ({
				url: `/eco-insumos/${idEco}/validar-stock`,
				method: "GET",
			}),
			transformResponse: (r: { ok: boolean; data: StockValidation }) => r.data,
		}),
	}),
	overrideExisting: false,
});

export const {
	useGetEcosConRecetaQuery,
	useGetInsumosEcoQuery,
	useAddInsumoEcoMutation,
	useUpdateInsumoEcoMutation,
	useDeleteInsumoEcoMutation,
	useValidarStockEcoQuery,
	useLazyValidarStockEcoQuery,
} = ecoInsumosApi;

export { ecoInsumosApi };
