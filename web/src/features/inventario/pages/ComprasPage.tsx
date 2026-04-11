import { useState, useMemo } from "react";
import {
	FileText,
	Plus,
	Trash2,
	X,
	ChevronLeft,
	ChevronRight,
	FileDown,
} from "lucide-react";
import Swal from "sweetalert2";
import {
	useGetProveedoresQuery,
	useGetProductosQuery,
	useGetNotasCompraQuery,
	useCreateNotaCompraMutation,
	useDeleteNotaCompraMutation,
} from "../api";
import { useGetDolarOficialQuery } from "../../dolar";
import NotaCompraDetalleModal from "../components/NotaCompraDetalleModal";
import { generateTableReport } from "../../../utils/generateTableReport";

/* ── Tipos locales ─────────────────────────────────── */
interface LineaCompra {
	id: number;
	id_producto: string;
	cantidad: number;
	precioUnitario: number;
}

let nextLineId = 2;

/* ── Componente ────────────────────────────────────── */
export default function ComprasPage() {
	const { data: proveedores = [] } = useGetProveedoresQuery();
	const { data: productos = [] } = useGetProductosQuery();
	const { data: notasCompra = [], isLoading: loadingNotas } = useGetNotasCompraQuery();
	const { data: dolarOficial } = useGetDolarOficialQuery();
	const [createNotaCompra] = useCreateNotaCompraMutation();
	const [deleteNotaCompra] = useDeleteNotaCompraMutation();

	// Formulario
	const [proveedor, setProveedor] = useState("");
	const [numFactura, setNumFactura] = useState("");
	const [fechaCompra, setFechaCompra] = useState("");
	const [observaciones, setObservaciones] = useState("");
	const [lineas, setLineas] = useState<LineaCompra[]>([
		{ id: 1, id_producto: "", cantidad: 0, precioUnitario: 0 },
	]);
	const [saving, setSaving] = useState(false);

	// Paginación historial
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 5;

	// Filtro de fechas
	const [dateFilter, setDateFilter] = useState("all");

	const DATE_FILTERS = [
		{ key: "all", label: "Todo" },
		{ key: "hoy", label: "Hoy" },
		{ key: "ayer", label: "Ayer" },
		{ key: "semana", label: "Esta semana" },
		{ key: "semana_pasada", label: "Semana pasada" },
		{ key: "mensual", label: "Este mes" },
		{ key: "trimestral", label: "Último trimestre" },
		{ key: "anual", label: "Este año" },
	];

	// Modal Detalle
	const [selectedNotaCompraId, setSelectedNotaCompraId] = useState<string | null>(null);
	const [showDetalleModal, setShowDetalleModal] = useState(false);

	const addLinea = () => {
		setLineas((prev) => [
			...prev,
			{ id: nextLineId++, id_producto: "", cantidad: 0, precioUnitario: 0 },
		]);
	};

	const removeLinea = (id: number) => {
		setLineas((prev) => prev.filter((l) => l.id !== id));
	};

	const updateLinea = (id: number, field: keyof LineaCompra, value: string | number) => {
		setLineas((prev) =>
			prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
		);
	};

	const tasaBcv = Number(dolarOficial?.promedio) || 0;
	const subtotal = lineas.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0);
	const impuesto = subtotal * 0.16;
	const total = subtotal + impuesto;
	const subtotalBs = subtotal * tasaBcv;
	const impuestoBs = impuesto * tasaBcv;
	const totalBs = total * tasaBcv;

	const resetForm = () => {
		setProveedor("");
		setNumFactura("");
		setFechaCompra("");
		setObservaciones("");
		setLineas([{ id: nextLineId++, id_producto: "", cantidad: 0, precioUnitario: 0 }]);
	};

	const handleGuardar = async () => {
		if (!proveedor) {
			return Swal.fire({ icon: "warning", title: "Seleccione un proveedor" });
		}
		if (!fechaCompra) {
			return Swal.fire({ icon: "warning", title: "Seleccione una fecha de compra" });
		}
		const lineasValidas = lineas.filter((l) => l.id_producto && l.cantidad > 0);
		if (lineasValidas.length === 0) {
			return Swal.fire({ icon: "warning", title: "Agregue al menos una línea con producto y cantidad" });
		}
		setSaving(true);
		try {
			await createNotaCompra({
				id_proveedor: proveedor,
				numero_factura: numFactura || undefined,
				fecha_compra: fechaCompra,
				observaciones: observaciones || undefined,
				lineas: lineasValidas.map((l) => ({
					id_producto: l.id_producto,
					cantidad: l.cantidad,
					precio_unitario: l.precioUnitario,
				})),
			}).unwrap();

			await Swal.fire({
				icon: "success",
				title: "Compra registrada",
				text: "Stock actualizado y movimiento registrado en el Kardex.",
				timer: 2500,
				showConfirmButton: false,
			});
			resetForm();
		} catch (err: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: err?.data?.message || "No se pudo registrar la compra",
			});
		} finally {
			setSaving(false);
		}
	};

	const handleEliminar = async (id: string) => {
		const result = await Swal.fire({
			title: "¿Eliminar nota de compra?",
			text: "Se revertirá el stock y los movimientos del Kardex asociados.",
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#d33",
			confirmButtonText: "Sí, eliminar",
			cancelButtonText: "Cancelar",
		});
		if (result.isConfirmed) {
			try {
				await deleteNotaCompra(id).unwrap();
				Swal.fire({ icon: "success", title: "Nota eliminada", timer: 1500, showConfirmButton: false });
			} catch (err: any) {
				Swal.fire({ icon: "error", title: "Error", text: err?.data?.message || "No se pudo eliminar" });
			}
		}
	};

	// Filtrado de historial por fecha
	const filteredNotas = useMemo(() => {
		if (dateFilter === "all") return notasCompra;
		return notasCompra.filter((nc) => {
			const dateStr = nc.fecha_compra;
			if (!dateStr) return true;
			const rowDate = new Date(dateStr);
			const today = new Date();
			rowDate.setHours(0, 0, 0, 0);
			today.setHours(0, 0, 0, 0);
			const diffDays = Math.floor((today.getTime() - rowDate.getTime()) / (1000 * 60 * 60 * 24));
			switch (dateFilter) {
				case "hoy": return diffDays === 0;
				case "ayer": return diffDays === 1;
				case "semana": return diffDays >= 0 && diffDays <= 6;
				case "semana_pasada": return diffDays >= 7 && diffDays <= 13;
				case "mensual": return rowDate.getMonth() === today.getMonth() && rowDate.getFullYear() === today.getFullYear();
				case "trimestral": {
					const mDiff = (today.getFullYear() - rowDate.getFullYear()) * 12 + (today.getMonth() - rowDate.getMonth());
					return mDiff >= 0 && mDiff <= 3;
				}
				case "anual": return rowDate.getFullYear() === today.getFullYear();
				default: return true;
			}
		});
	}, [notasCompra, dateFilter]);

	const handleDownloadReport = () => {
		const tableHeaders = ["Fecha", "Proveedor", "Nº Factura", "Descripción", "Total", "Líneas"];
		const tableData = filteredNotas.map((nc) => [
			new Date(nc.fecha_compra).toLocaleDateString("es-VE"),
			nc.proveedor_nombre || "—",
			nc.numero_factura || "S/N",
			nc.descripcion_productos || nc.observaciones || "S/D",
			`$${Number(nc.total).toFixed(2)}`,
			(nc.total_lineas || 0).toString(),
		]);

		const totalSuma = filteredNotas.reduce((acc, current) => acc + Number(current.total), 0);
		const totalGenerado = `$${totalSuma.toFixed(2)}`;

		const filterObj = DATE_FILTERS.find((f) => f.key === dateFilter);
		const currentFilterName = filterObj ? filterObj.label : "Todo";

		generateTableReport({
			title: "Historial de compras registradas",
			subtitle: `Reporte de compras: ${new Date().toLocaleDateString("es-VE")}${dateFilter !== "all" ? ` (Filtro: ${currentFilterName})` : ""}`,
			reportInfo: [
				{ label: "Total Registros", value: filteredNotas.length.toString() },
			],
			tableHeaders,
			tableData,
			total: totalGenerado,
			filename: `Registro_Compras_${new Date().getTime()}.pdf`,
		});
	};

	// Paginación historial
	const totalPages = Math.ceil(filteredNotas.length / itemsPerPage);
	const currentNotas = filteredNotas.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage,
	);

	return (
		<div className="p-4 md:p-6 space-y-6">
			{/* ── Header ── */}
			<div>
				<h1 className="text-2xl md:text-3xl font-bold text-gray-900">
					Registro de Compra
				</h1>
				<p className="text-gray-500 mt-1 text-sm">
					Gestione la entrada de nuevos insumos al inventario médico con precisión
					editorial y control total.
				</p>
			</div>

			{/* ── Datos de Factura ── */}
			<div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
				<div className="flex items-center gap-2 text-gray-800 font-semibold">
					<FileText className="h-5 w-5 text-teal-600" />
					Datos de Factura
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
							Proveedor *
						</label>
						<select
							value={proveedor}
							onChange={(e) => setProveedor(e.target.value)}
							className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
						>
							<option value="">Seleccionar Proveedor</option>
							{proveedores.filter((p) => p.activo).map((p) => (
								<option key={p.id_proveedor} value={p.id_proveedor}>
									{p.nombre}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
							Nº Factura
						</label>
						<input
							type="text"
							placeholder="F-001-2024"
							value={numFactura}
							onChange={(e) => setNumFactura(e.target.value)}
							className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
						/>
					</div>
					<div>
						<label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
							Fecha de Compra *
						</label>
						<input
							type="date"
							value={fechaCompra}
							onChange={(e) => setFechaCompra(e.target.value)}
							className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
						/>
					</div>
				</div>
			</div>

			{/* ── Detalle de Insumos ── */}
			<div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 text-gray-800 font-semibold">
						<Plus className="h-5 w-5 text-teal-600" />
						Detalle de Insumos
					</div>
					<button
						onClick={addLinea}
						className="text-teal-600 hover:text-teal-800 text-sm font-medium flex items-center gap-1"
					>
						<Plus className="h-4 w-4" />
						Agregar Línea
					</button>
				</div>

				<div className="hidden md:grid grid-cols-12 gap-3 text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
					<div className="col-span-4">Insumo / Producto</div>
					<div className="col-span-2">Cantidad</div>
					<div className="col-span-3">Costo Unitario</div>
					<div className="col-span-2 text-right">Subtotal</div>
					<div className="col-span-1" />
				</div>

				{lineas.map((linea) => {
					const lineSubtotalUsd = linea.cantidad * linea.precioUnitario;
					const lineSubtotalBs = lineSubtotalUsd * tasaBcv;
					return (
						<div
							key={linea.id}
							className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center border border-gray-100 rounded-lg p-3 md:p-2 md:border-0"
						>
							<div className="col-span-4">
								<select
									value={linea.id_producto}
									onChange={(e) => updateLinea(linea.id, "id_producto", e.target.value)}
									className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
								>
									<option value="">Seleccionar producto...</option>
									{productos.map((p) => (
										<option key={p.id_producto} value={p.id_producto}>
											{p.nombre} - {p.unidad_compra || "Caja"} x{Number(p.factor_conversion) || 1} (Stock: {Math.floor(Number(p.stock_base_total || 0) / (Number(p.factor_conversion) || 1))} {p.unidad_compra || "Caja"})
										</option>
									))}
								</select>
							</div>
							<div className="col-span-2">
								<input
									type="number"
									min={0}
									step="any"
									value={linea.cantidad === 0 ? "" : linea.cantidad}
									onChange={(e) =>
										updateLinea(linea.id, "cantidad", Number(e.target.value))
									}
									onFocus={(e) => e.target.select()}
									className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
								/>
							</div>
							<div className="col-span-3">
								<div className="grid grid-cols-2 gap-2">
									<div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-teal-500">
										<span className="bg-gray-50 px-2 py-2 text-xs text-gray-600 border-r border-gray-200">$</span>
										<input
											type="number"
											step="0.01"
											min={0}
											value={linea.precioUnitario === 0 ? "" : linea.precioUnitario}
											onChange={(e) =>
												updateLinea(linea.id, "precioUnitario", Number(e.target.value))
											}
											onFocus={(e) => e.target.select()}
											className="w-full px-2 py-2 text-sm focus:outline-none"
										/>
									</div>
									<div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-teal-500">
										<span className="bg-gray-50 px-2 py-2 text-xs text-gray-600 border-r border-gray-200">Bs</span>
										<input
											type="number"
											step="0.01"
											min={0}
											value={tasaBcv > 0 && linea.precioUnitario > 0 ? Number((linea.precioUnitario * tasaBcv).toFixed(4)) : ""}
											onChange={(e) => {
												const valorBs = Number(e.target.value);
												if (tasaBcv > 0) {
													updateLinea(linea.id, "precioUnitario", valorBs / tasaBcv);
												}
											}}
											onFocus={(e) => e.target.select()}
											disabled={tasaBcv <= 0}
											placeholder={tasaBcv > 0 ? "0.00" : "Sin tasa BCV"}
											className="w-full px-2 py-2 text-sm focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
										/>
									</div>
								</div>
							</div>
							<div className="col-span-2 text-right font-semibold text-gray-800">
								<div className="flex items-center justify-end gap-2 text-xs md:text-sm">
									<span>${lineSubtotalUsd.toFixed(2)}</span>
									<span className="text-gray-400">|</span>
									<span className="text-gray-600">Bs {lineSubtotalBs.toFixed(2)}</span>
								</div>
							</div>
							<div className="col-span-1 flex justify-center">
								<button
									onClick={() => removeLinea(linea.id)}
									className="text-red-400 hover:text-red-600 transition-colors p-1.5 rounded hover:bg-red-50"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						</div>
					);
				})}

				{/* ── Totales ── */}
				<div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
					<div className="flex justify-end text-xs text-gray-500">
						Tasa BCV del día: {tasaBcv > 0 ? `${tasaBcv.toFixed(2)} Bs/USD` : "No disponible"}
					</div>
					<div className="flex justify-end gap-8 text-sm text-gray-600">
						<span>Subtotal</span>
						<div className="font-medium text-right flex items-center gap-2">
							<span>${subtotal.toFixed(2)}</span>
							<span className="text-gray-400">|</span>
							<span>Bs {subtotalBs.toFixed(2)}</span>
						</div>
					</div>
					<div className="flex justify-end gap-8 text-sm text-gray-600">
						<span>Impuestos (16%)</span>
						<div className="font-medium text-right flex items-center gap-2">
							<span>${impuesto.toFixed(2)}</span>
							<span className="text-gray-400">|</span>
							<span>Bs {impuestoBs.toFixed(2)}</span>
						</div>
					</div>
					<div className="flex justify-end gap-8 text-lg font-bold text-gray-900">
						<span>Total Compra</span>
						<div className="text-teal-600 text-right flex items-center gap-2">
							<span>${total.toFixed(2)}</span>
							<span className="text-teal-300">|</span>
							<span className="text-sm">Bs {totalBs.toFixed(2)}</span>
						</div>
					</div>
				</div>
			</div>

			{/* ── Acciones ── */}
			<div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl border border-gray-200 p-4">
				<button
					onClick={resetForm}
					className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
				>
					<X className="h-4 w-4" />
					Descartar
				</button>
				<button
					onClick={handleGuardar}
					disabled={saving}
					className="px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-60"
				>
					{saving ? "Guardando..." : "Guardar Compra"}
				</button>
			</div>

			{/* ── Historial de Notas de Compra ── */}
			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
					<div className="flex flex-col sm:flex-row sm:items-center gap-3">
						<h2 className="text-lg font-bold text-gray-900">Historial de compras</h2>
						{filteredNotas.length > 0 && (
							<button
								onClick={handleDownloadReport}
								className="flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-teal-700 md:w-auto"
							>
								<FileDown size={14} />
								Descargar Reporte
							</button>
						)}
					</div>
					{/* Filtro de período */}
					<div className="flex flex-wrap gap-1.5">
						{DATE_FILTERS.map((f) => (
							<button
								key={f.key}
								onClick={() => { setDateFilter(f.key); setCurrentPage(1); }}
								className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
									dateFilter === f.key
										? "bg-teal-600 text-white shadow-sm"
										: "bg-gray-100 text-gray-600 hover:bg-gray-200"
								}`}
							>
								{f.label}
							</button>
						))}
					</div>
				</div>
				{loadingNotas ? (
					<div className="p-6 text-center text-gray-400">Cargando...</div>
				) : notasCompra.length === 0 ? (
					<div className="p-6 text-center text-gray-400">No hay registros de compras</div>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="bg-gray-50 border-b border-gray-200">
										<th className="text-left px-6 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wider">Fecha</th>
										<th className="text-left px-6 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wider">Proveedor</th>
										<th className="text-left px-6 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wider">Nº Factura</th>
										<th className="text-left px-6 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wider">Descripción</th>
										<th className="text-right px-6 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wider">Total</th>
										<th className="text-center px-6 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wider">Líneas</th>
										<th className="text-right px-6 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wider">Acciones</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100">
									{currentNotas.map((nc) => (
										<tr key={nc.id_nota_compra} className="hover:bg-gray-50 transition-colors">
											<td className="px-6 py-4 text-gray-700">
												{new Date(nc.fecha_compra).toLocaleDateString("es-VE")}
											</td>
											<td className="px-6 py-4 font-medium text-gray-900">
												{nc.proveedor_nombre || "—"}
											</td>
											<td className="px-6 py-4 text-teal-600 font-medium">
												<button
													onClick={() => {
														setSelectedNotaCompraId(nc.id_nota_compra);
														setShowDetalleModal(true);
													}}
													className="hover:underline text-left outline-none"
												>
													{nc.numero_factura || "S/N"}
												</button>
											</td>
											<td className="px-6 py-4 text-gray-600 text-xs">
												{nc.descripcion_productos || nc.observaciones || "S/D"}
											</td>
											<td className="px-6 py-4 text-right font-bold text-teal-600">
												${Number(nc.total).toFixed(2)}
											</td>
											<td className="px-6 py-4 text-center">
												<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
													{nc.total_lineas || 0}
												</span>
											</td>
											<td className="px-6 py-4 text-right">
												<div className="flex justify-end gap-2">
													<button
														onClick={() => handleEliminar(nc.id_nota_compra)}
														className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
														title="Eliminar"
													>
														<Trash2 className="h-4 w-4" />
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{totalPages > 1 && (
							<div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
								<span>Mostrando {currentNotas.length} de {filteredNotas.length} notas{dateFilter !== "all" ? ` (filtradas)` : ""}</span>
								<div className="flex items-center gap-1">
									<button
										disabled={currentPage <= 1}
										onClick={() => setCurrentPage((p) => p - 1)}
										className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40"
									>
										<ChevronLeft className="h-4 w-4" />
									</button>
									{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
										<button
											key={page}
											onClick={() => setCurrentPage(page)}
											className={`px-2.5 py-1 rounded font-medium ${page === currentPage ? "bg-teal-600 text-white" : "hover:bg-gray-200 text-gray-700"}`}
										>
											{page}
										</button>
									))}
									<button
										disabled={currentPage >= totalPages}
										onClick={() => setCurrentPage((p) => p + 1)}
										className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40"
									>
										<ChevronRight className="h-4 w-4" />
									</button>
								</div>
							</div>
						)}
					</>
				)}
			</div>

			{/* Modal Detalle Factura */}
			<NotaCompraDetalleModal
				isOpen={showDetalleModal}
				onClose={() => {
					setShowDetalleModal(false);
					setSelectedNotaCompraId(null);
				}}
				idNotaCompra={selectedNotaCompraId}
			/>
		</div>
	);
}
