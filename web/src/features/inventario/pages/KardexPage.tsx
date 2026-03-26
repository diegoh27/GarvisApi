import { useState } from "react";
import { History, Search, ArrowUpRight, ArrowDownRight, Settings2 } from "lucide-react";
import { useGetKardexQuery } from "../api";
import { useGetProductosQuery } from "../api/productosApi";
import GenericTable from "../components/GenericTable";

export default function KardexPage() {
	const [filtroProducto, setFiltroProducto] = useState<string>("");
	const [filtroTipo, setFiltroTipo] = useState<string>(""); // ENTRADA, SALIDA, AJUSTE
	
	const { data: productos = [] } = useGetProductosQuery();
	const { data: kardexDocs = [], isLoading } = useGetKardexQuery(
		filtroProducto ? { id_producto: filtroProducto } : undefined
	);

	// Client-side filtering for Tipo Movimiento
	const filteredData = kardexDocs.filter((item) => {
		if (filtroTipo && item.tipo_movimiento !== filtroTipo) return false;
		return true;
	});

	const getTipoBadge = (tipo: string) => {
		switch (tipo) {
			case "ENTRADA":
				return (
					<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
						<ArrowUpRight className="w-3.5 h-3.5" /> Entrada
					</span>
				);
			case "SALIDA":
				return (
					<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
						<ArrowDownRight className="w-3.5 h-3.5" /> Salida
					</span>
				);
			case "AJUSTE":
				return (
					<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
						<Settings2 className="w-3.5 h-3.5" /> Ajuste
					</span>
				);
			default:
				return <span className="text-gray-500 text-xs font-medium">{tipo}</span>;
		}
	};

	const columns = [
		{
			key: "fecha",
			header: "Fecha",
			headerClassName: "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider",
			cellClassName: "px-4 py-3 text-sm text-gray-900 whitespace-nowrap",
			render: (row: any) => new Date(row.creado_en).toLocaleString("es-ES", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			}),
		},
		{
			key: "producto",
			header: "Producto",
			headerClassName: "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider",
			cellClassName: "px-4 py-3 text-sm font-medium text-gray-900",
			render: (row: any) => row.producto_nombre,
		},
		{
			key: "tipo",
			header: "Operación",
			headerClassName: "px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider",
			cellClassName: "px-4 py-3 text-center",
			render: (row: any) => getTipoBadge(row.tipo_movimiento),
		},
		{
			key: "cantidades",
			header: "Movimiento",
			headerClassName: "px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider",
			cellClassName: "px-4 py-3 text-sm text-center tabular-nums",
			render: (row: any) => {
				const isPos = row.tipo_movimiento === "ENTRADA" || (row.tipo_movimiento === "AJUSTE" && Number(row.stock_posterior) > Number(row.stock_anterior));
				const sign = isPos ? "+" : "-";
				const color = isPos ? "text-green-600" : row.tipo_movimiento === "SALIDA" ? "text-red-600" : "text-gray-900";
				return (
					<span className={`font-semibold ${color}`}>
						{sign}{Number(row.cantidad)} {row.unidad_medida || ""}
					</span>
				);
			},
		},
		{
			key: "saldo",
			header: "Saldo Final",
			headerClassName: "px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider",
			cellClassName: "px-4 py-3 text-sm text-right tabular-nums text-gray-900 font-medium",
			render: (row: any) => `${Number(row.stock_posterior)} ${row.unidad_medida || ""}`.trim(),
		},
		{
			key: "referencia",
			header: "Referencia / Observaciones",
			headerClassName: "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider",
			cellClassName: "px-4 py-3 text-xs text-gray-600 max-w-xs truncate",
			render: (row: any) => row.observaciones || row.referencia_tipo || "S/N",
		},
	];

	return (
		<div className="p-4 md:p-6 space-y-6">
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<History className="text-teal-600 w-6 h-6" /> Kardex de Movimientos
					</h1>
					<p className="text-gray-500 mt-1 text-sm">
						Auditoría completa de entradas, salidas y ajustes de inventario.
					</p>
				</div>
			</div>

			{/* Filtros */}
			<div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
				<div className="w-full md:w-1/3 relative">
					<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<Search className="h-4 w-4 text-gray-400" />
					</div>
					<select
						value={filtroProducto}
						onChange={(e) => setFiltroProducto(e.target.value)}
						className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none bg-gray-50"
					>
						<option value="">Todos los productos</option>
						{productos.map((p) => (
							<option key={p.id_producto} value={p.id_producto}>
								{p.nombre}
							</option>
						))}
					</select>
				</div>
				<div className="w-full md:w-1/4">
					<select
						value={filtroTipo}
						onChange={(e) => setFiltroTipo(e.target.value)}
						className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50"
					>
						<option value="">Cualquier Movimiento</option>
						<option value="ENTRADA">Entradas</option>
						<option value="SALIDA">Salidas</option>
						<option value="AJUSTE">Ajustes</option>
					</select>
				</div>
				<div className="text-xs text-gray-400 flex-1 text-right">
					Mostrando {filteredData.length} registros
				</div>
			</div>

			{/* Tabla */}
			<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
				{isLoading ? (
					<div className="p-12 text-center text-gray-400">Cargando movimientos...</div>
				) : (
					<GenericTable
						columns={columns}
						rows={filteredData}
						rowKey={(row) => row.id_kardex}
						tableClassName="w-full min-w-full"
						theadClassName="bg-gray-50 border-b border-gray-200"
						getRowClassName={(_row, index) => (index % 2 === 0 ? "bg-white" : "bg-gray-50/50")}
						emptyState="No hay registros de movimientos para los filtros seleccionados."
					/>
				)}
			</div>
		</div>
	);
}
