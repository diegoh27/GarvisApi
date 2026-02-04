import { useState, useMemo, useEffect } from "react";
import { Filter, Layers, PackagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { PageShell } from "../../../shared";
import { useListProductosQuery, useGetGastoProductosQuery, useGetHistorialLotesQuery } from "../../productos/productosApi";
import type { ProductoListItem } from "../../productos/productosApi";
import { AnadirProductoModal, AgregarLoteModal, EditarProductoModal, LotesDeProductoModal } from "../components";

const ITEMS_PER_PAGE = 25;

type PeriodoGasto = "hoy" | "semana" | "mes";

function getRangoPeriodo(periodo: PeriodoGasto): { desde: string; hasta: string } {
	const hoy = new Date();
	const toYMD = (d: Date) => d.toISOString().slice(0, 10);
	const hasta = toYMD(hoy);
	let desde: string;
	if (periodo === "hoy") {
		desde = hasta;
	} else if (periodo === "semana") {
		const d = new Date(hoy);
		d.setDate(d.getDate() - 6);
		desde = toYMD(d);
	} else {
		// mes
		desde = toYMD(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
	}
	return { desde, hasta };
}

const TABS = [
	{ id: "productos", label: "Productos" },
	{ id: "entes-legales", label: "Entes Legales" },
	{ id: "nomina", label: "Nómina" },
	{ id: "alquiler", label: "Alquiler" },
	{ id: "facturacion", label: "Facturación" },
	{ id: "citas", label: "Citas" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const formatDate = (value: string | null): string => {
	if (!value) return "N/A";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "N/A";
	return d.toLocaleDateString("es-VE", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
};

/** Badge de estado de stock según cantidad vs stock_minimo */
const StockBadge = ({ cantidad, stockMinimo }: { cantidad: number; stockMinimo: number }) => {
	let label: string;
	let className: string;
	if (cantidad <= 0) {
		label = "Comprar";
		className = "rounded-full bg-red-500/90 px-2 py-0.5 text-xs font-medium text-paper";
	} else if (cantidad < stockMinimo) {
		label = "Poco";
		className = "rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-paper";
	} else {
		label = "Medio";
		className = "rounded-full bg-yellow-500/90 px-2 py-0.5 text-xs font-medium text-paper";
	}
	return <span className={className}>{label}</span>;
};

const InventarioPage = () => {
	const [activeTab, setActiveTab] = useState<TabId>("productos");
	const [currentPage, setCurrentPage] = useState(1);
	const [buscar, setBuscar] = useState("");
	const [showAnadirProductoModal, setShowAnadirProductoModal] = useState(false);
	const [productoParaLote, setProductoParaLote] = useState<{
		id_producto: string;
		nombre: string;
		precio?: number;
	} | null>(null);
	const [productoParaEditar, setProductoParaEditar] = useState<ProductoListItem | null>(null);
	const [productoParaVerLotes, setProductoParaVerLotes] = useState<{ id_producto: string; nombre: string } | null>(null);
	const [periodoGasto, setPeriodoGasto] = useState<PeriodoGasto>("mes");

	const rangoGasto = useMemo(() => getRangoPeriodo(periodoGasto), [periodoGasto]);
	const { data: gastoData, isLoading: loadingGasto } = useGetGastoProductosQuery(rangoGasto, {
		skip: activeTab !== "productos",
	});

	const { data: productos = [], isLoading: loadingProductos } = useListProductosQuery(undefined, {
		skip: activeTab !== "productos",
	});
	const { data: historialLotes = [], isLoading: loadingHistorial } = useGetHistorialLotesQuery(undefined, {
		skip: activeTab !== "productos",
	});

	const productosFiltrados = useMemo(() => {
		if (!buscar.trim()) return productos;
		const q = buscar.toLowerCase().trim();
		return productos.filter(
			(p) =>
				p.nombre.toLowerCase().includes(q) ||
				p.unidad.toLowerCase().includes(q) ||
				p.id_producto.toLowerCase().includes(q),
		);
	}, [productos, buscar]);

	const paginatedProductos = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return productosFiltrados.slice(start, start + ITEMS_PER_PAGE);
	}, [productosFiltrados, currentPage]);

	const totalPagesProductos = Math.max(
		1,
		Math.ceil(productosFiltrados.length / ITEMS_PER_PAGE),
	);

	useEffect(() => {
		setCurrentPage(1);
	}, [activeTab, buscar]);

	const addButtonLabel: Record<TabId, string> = {
		"productos": "Añadir Producto",
		"entes-legales": "Añadir ente legal",
		"nomina": "Añadir nómina",
		"alquiler": "Añadir alquiler",
		"facturacion": "Añadir facturación",
		"citas": "Añadir cita",
	};

	const handleAñadirClick = () => {
		if (activeTab === "productos") {
			setShowAnadirProductoModal(true);
		}
	};

	const periodoGastoLabel = { hoy: "Hoy", semana: "Esta semana", mes: "Este mes" } as const;

	return (
		<PageShell
			title="Inventario"
			description="Productos, entes legales, nómina, alquiler, facturación y citas."
		>
			{/* Gasto en compras (solo en pestaña Productos) */}
			{activeTab === "productos" && (
				<div className="mb-4 rounded-lg border border-brand-200 bg-brand-50/50 px-4 py-3">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-sm font-medium text-brand-800">Gasto en compras:</span>
							<div className="flex rounded-lg border border-brand-200 bg-paper overflow-hidden">
								{(["hoy", "semana", "mes"] as const).map((p) => (
									<button
										key={p}
										type="button"
										onClick={() => setPeriodoGasto(p)}
										className={`px-3 py-1.5 text-xs font-medium transition-colors ${periodoGasto === p
											? "bg-brand-700 text-paper"
											: "text-brand-700 hover:bg-brand-100"
											}`}
									>
										{periodoGastoLabel[p]}
									</button>
								))}
							</div>
						</div>
						<div className="text-lg font-semibold text-brand-900">
							{loadingGasto ? "…" : `${(gastoData?.total ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`}
						</div>
					</div>
					{gastoData?.por_dia && gastoData.por_dia.length > 0 && (
						<div className="mt-2 border-t border-brand-200 pt-2">
							<p className="mb-1 text-xs font-medium text-brand-700">Desglose por día:</p>
							<ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-800">
								{gastoData.por_dia.map((d) => (
									<li key={d.fecha}>
										{formatDate(d.fecha)}: {d.total.toFixed(2)} $ ({d.entradas} entrada{d.entradas !== 1 ? "s" : ""})
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}

			{/* Tabs */}
			<div className="border-b border-brand-200">
				<div className="flex flex-wrap gap-1 overflow-x-auto">
					{TABS.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`rounded-t-lg border border-b-0 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
								? "border-brand-300 bg-brand-700 text-paper"
								: "border-transparent bg-cloud text-brand-800 hover:bg-mist"
								}`}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			<div className="rounded-b-lg border border-t-0 border-brand-200 bg-paper">
				{/* Barra: Buscar, Filtro, Añadir (común a todas las pestañas) */}
				<div className="flex flex-wrap items-center gap-3 border-b border-brand-100 p-4">
					<input
						type="text"
						value={buscar}
						onChange={(e) => setBuscar(e.target.value)}
						placeholder="Buscar"
						className="min-w-[200px] flex-1 rounded-lg border border-brand-300 bg-paper px-4 py-2.5 text-sm text-brand-900 placeholder:text-brand-400 outline-none focus:border-brand-700"
					/>
					<button
						type="button"
						className="rounded-lg border border-brand-300 bg-paper p-2.5 text-brand-700 transition-colors hover:bg-brand-50"
						title="Filtrar"
					>
						<Filter className="h-5 w-5" />
					</button>
					<button
						type="button"
						onClick={handleAñadirClick}
						className="flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-brand-800"
					>
						<Plus className="h-5 w-5" />
						{addButtonLabel[activeTab]}
					</button>
				</div>

				{activeTab === "productos" && (
					<>
						{loadingProductos ? (
							<div className="p-8 text-center text-brand-600">
								Cargando productos...
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full min-w-[900px] text-left text-sm">
									<thead>
										<tr className="border-b border-brand-200 bg-brand-100/50">
											<th className="px-4 py-3 font-semibold text-brand-900">ID</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Producto</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Unidad</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Stock mín.</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Cantidad</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Activo</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Estado stock</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Estado</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Precio u</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Precio T</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Fecha ing.</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Fecha venc.</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Config</th>
										</tr>
									</thead>
									<tbody>
										{paginatedProductos.length === 0 ? (
											<tr>
												<td colSpan={13} className="px-4 py-8 text-center text-brand-600">
													{buscar.trim()
														? "No hay productos que coincidan con la búsqueda."
														: "No hay productos registrados."}
												</td>
											</tr>
										) : (
											paginatedProductos.map((row, idx) => (
												<ProductoTableRow
													key={row.id_producto}
													row={row}
													index={idx}
													onAgregarLote={() =>
														setProductoParaLote({
															id_producto: row.id_producto,
															nombre: row.nombre,
															precio: Number(row.precio),
														})
													}
													onEditar={() => setProductoParaEditar(row)}
													onVerLotes={() => setProductoParaVerLotes({ id_producto: row.id_producto, nombre: row.nombre })}
												/>
											))
										)}
									</tbody>
								</table>
							</div>
						)}

						{productosFiltrados.length > 0 && (
							<div className="flex flex-wrap items-center justify-between gap-4 border-t border-mist px-4 py-3">
								<p className="text-xs text-brand-800">
									Mostrando{" "}
									{(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
									{Math.min(currentPage * ITEMS_PER_PAGE, productosFiltrados.length)} de{" "}
									{productosFiltrados.length} productos
								</p>
								{totalPagesProductos > 1 && (
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
											disabled={currentPage === 1}
											className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 transition-colors hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-50"
										>
											Anterior
										</button>
										<span className="text-xs text-brand-800">
											Página {currentPage} de {totalPagesProductos}
										</span>
										<button
											type="button"
											onClick={() =>
												setCurrentPage((p) => Math.min(totalPagesProductos, p + 1))
											}
											disabled={currentPage === totalPagesProductos}
											className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 transition-colors hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-50"
										>
											Siguiente
										</button>
									</div>
								)}
							</div>
						)}

						{/* Historial de lotes de compras */}
						<div className="border-t border-brand-200 px-4 py-4">
							<h3 className="mb-3 text-sm font-semibold text-brand-900">Historial de lotes de compras</h3>
							{loadingHistorial ? (
								<p className="text-sm text-brand-600">Cargando historial...</p>
							) : historialLotes.length === 0 ? (
								<p className="text-sm text-brand-600">No hay registros de entradas/lotes.</p>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full min-w-[500px] text-left text-sm">
										<thead>
											<tr className="border-b border-brand-200 bg-brand-100/50">
												<th className="px-3 py-2 font-semibold text-brand-900">Producto</th>
												<th className="px-3 py-2 font-semibold text-brand-900">Cantidad</th>
												<th className="px-3 py-2 font-semibold text-brand-900">Fecha ingreso</th>
												<th className="px-3 py-2 font-semibold text-brand-900">Fecha venc.</th>
												<th className="px-3 py-2 font-semibold text-brand-900">Costo total</th>
											</tr>
										</thead>
										<tbody>
											{historialLotes.map((item, idx) => (
												<tr
													key={item.id_lote}
													className={`border-b border-brand-100 ${idx % 2 === 0 ? "bg-paper" : "bg-brand-50/30"}`}
												>
													<td className="px-3 py-2 text-brand-900">{item.nombre_producto}</td>
													<td className="px-3 py-2 text-brand-800">{item.cantidad}</td>
													<td className="px-3 py-2 text-brand-800">{formatDate(item.fecha_ingreso)}</td>
													<td className="px-3 py-2 text-brand-800">{formatDate(item.fecha_vencimiento)}</td>
													<td className="px-3 py-2 text-brand-800">
														{item.costo_total != null ? `${Number(item.costo_total).toFixed(2)} $` : "—"}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
							{historialLotes.length > 0 && (
								<p className="mt-2 text-xs text-brand-600">
									Últimas {historialLotes.length} entradas, ordenadas por fecha de ingreso (más reciente primero).
								</p>
							)}
						</div>
					</>
				)}

				{activeTab !== "productos" && (
					<div className="p-8 text-center text-brand-600">
						Contenido en desarrollo para {TABS.find((t) => t.id === activeTab)?.label}.
					</div>
				)}
			</div>

			{showAnadirProductoModal && (
				<AnadirProductoModal
					onClose={() => setShowAnadirProductoModal(false)}
					onSuccess={() => setShowAnadirProductoModal(false)}
				/>
			)}

			{productoParaLote && (
				<AgregarLoteModal
					producto={productoParaLote}
					onClose={() => setProductoParaLote(null)}
					onSuccess={() => setProductoParaLote(null)}
				/>
			)}

			{productoParaEditar && (
				<EditarProductoModal
					producto={productoParaEditar}
					onClose={() => setProductoParaEditar(null)}
					onSuccess={() => setProductoParaEditar(null)}
				/>
			)}

			{productoParaVerLotes && (
				<LotesDeProductoModal
					id_producto={productoParaVerLotes.id_producto}
					nombre={productoParaVerLotes.nombre}
					onClose={() => setProductoParaVerLotes(null)}
				/>
			)}
		</PageShell>
	);
};

function ProductoTableRow({
	row,
	index,
	onAgregarLote,
	onEditar,
	onVerLotes,
}: {
	row: ProductoListItem;
	index: number;
	onAgregarLote: () => void;
	onEditar: () => void;
	onVerLotes: () => void;
}) {
	const precioTotal = Number(row.precio) * Number(row.cantidad);
	const bg = index % 2 === 0 ? "bg-paper" : "bg-brand-50/30";

	return (
		<tr className={`border-b border-brand-100 ${bg}`}>
			<td className="px-4 py-2 font-mono text-xs text-brand-800">
				{row.id_producto.slice(0, 8)}…
			</td>
			<td className="px-4 py-2 text-brand-900">{row.nombre}</td>
			<td className="px-4 py-2 text-brand-800">{row.unidad}</td>
			<td className="px-4 py-2 text-brand-800">{row.stock_minimo}</td>
			<td className="px-4 py-2 text-brand-800">{row.cantidad}</td>
			<td className="px-4 py-2 text-brand-800">
				{row.activo ? "Sí" : "No"}
			</td>
			<td className="px-4 py-2">
				<StockBadge cantidad={Number(row.cantidad)} stockMinimo={row.stock_minimo} />
			</td>
			<td className="px-4 py-2 text-brand-800">—</td>
			<td className="px-4 py-2 text-brand-800">
				{Number(row.precio).toFixed(2)}$
			</td>
			<td className="px-4 py-2 text-brand-800">
				{precioTotal.toFixed(2)}$
			</td>
			<td className="px-4 py-2 text-brand-800">
				{formatDate(row.fecha_ingreso)}
			</td>
			<td className="px-4 py-2 text-brand-800">
				{formatDate(row.fecha_vencimiento)}
			</td>
			<td className="px-4 py-2">
				<div className="flex flex-wrap items-center gap-1">
					<button
						type="button"
						onClick={onAgregarLote}
						className="rounded p-1.5 text-brand-600 hover:bg-brand-100 hover:text-brand-800"
						title="Registrar entrada / Agregar lote"
					>
						<PackagePlus className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={onVerLotes}
						className="rounded p-1.5 text-brand-600 hover:bg-brand-100 hover:text-brand-800"
						title="Ver y editar lotes"
					>
						<Layers className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={() => onEditar?.()}
						className="rounded p-1.5 text-brand-600 hover:bg-brand-100 hover:text-brand-800"
						title="Editar"
					>
						<Pencil className="h-4 w-4" />
					</button>
					<button
						type="button"
						className="rounded p-1.5 text-brand-600 hover:bg-red-50 hover:text-red-600"
						title="Eliminar"
					>
						<Trash2 className="h-4 w-4" />
					</button>
				</div>
			</td>
		</tr>
	);
}

export default InventarioPage;
