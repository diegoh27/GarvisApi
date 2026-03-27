import { useState, useMemo } from "react";
import {
	Beaker,
	Search,
	Plus,
	Trash2,
	ChevronRight,
	Package,
	AlertTriangle,
	CheckCircle2,
} from "lucide-react";
import Swal from "sweetalert2";
import {
	useGetEcosConRecetaQuery,
	useGetInsumosEcoQuery,
	useGetProductosQuery,
	useAddInsumoEcoMutation,
	useUpdateInsumoEcoMutation,
	useDeleteInsumoEcoMutation,
} from "../api";

export default function RecetasPage() {
	const { data: ecos = [], isLoading: loadingEcos } = useGetEcosConRecetaQuery();
	const { data: productos = [] } = useGetProductosQuery();
	const [selectedEco, setSelectedEco] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");

	const { data: insumos = [], isLoading: loadingInsumos } = useGetInsumosEcoQuery(
		selectedEco || "",
		{ skip: !selectedEco },
	);
	const [addInsumo] = useAddInsumoEcoMutation();
	const [updateInsumo] = useUpdateInsumoEcoMutation();
	const [deleteInsumo] = useDeleteInsumoEcoMutation();

	/* ── Filtrado de ecos ── */
	const filteredEcos = useMemo(() => {
		if (!searchQuery.trim()) return ecos;
		const q = searchQuery.toLowerCase();
		return ecos.filter((e) => e.nombre.toLowerCase().includes(q));
	}, [ecos, searchQuery]);

	const selectedEcoData = ecos.find((e) => e.id_eco === selectedEco);

	/* ── Productos disponibles (no ya en la receta) ── */
	const productosDisponibles = useMemo(() => {
		const idsEnReceta = new Set(insumos.map((i) => i.id_producto));
		return productos.filter((p) => !idsEnReceta.has(p.id_producto));
	}, [productos, insumos]);

	/* ── Handlers ── */
	const handleAgregarInsumo = async () => {
		if (!selectedEco) return;

		const options = productosDisponibles.reduce(
			(acc, p) => {
				acc[p.id_producto] = `${p.nombre} (Stock: ${Math.floor(Number(p.stock_base_total))} ${p.unidad_consumo || 'u'})`;
				return acc;
			},
			{} as Record<string, string>,
		);

		if (Object.keys(options).length === 0) {
			return Swal.fire({
				icon: "info",
				title: "Sin productos disponibles",
				text: "Todos los productos ya están en la receta o no hay productos registrados.",
			});
		}

		const { value: id_producto } = await Swal.fire({
			title: "Agregar Insumo",
			input: "select",
			inputOptions: options,
			inputPlaceholder: "Seleccionar producto...",
			showCancelButton: true,
			confirmButtonColor: "#0d9488",
			confirmButtonText: "Siguiente",
			cancelButtonText: "Cancelar",
		});

		if (!id_producto) return;

		const { value: cantidad } = await Swal.fire({
			title: "Cantidad por estudío",
			input: "number",
			inputValue: 1,
			inputAttributes: { min: "0.01", step: "any" },
			showCancelButton: true,
			confirmButtonColor: "#0d9488",
			confirmButtonText: "Guardar",
			cancelButtonText: "Cancelar",
			inputValidator: (v) => {
				if (!v || Number(v) <= 0) return "La cantidad debe ser mayor a 0";
				return null;
			},
		});

		if (!cantidad) return;

		try {
			await addInsumo({
				idEco: selectedEco,
				id_producto,
				cantidad: Number(cantidad),
			}).unwrap();
			Swal.fire({ icon: "success", title: "Insumo agregado", timer: 1500, showConfirmButton: false });
		} catch (err: any) {
			Swal.fire({ icon: "error", title: "Error", text: err?.data?.message || "No se pudo agregar" });
		}
	};

	const handleEditarCantidad = async (insumo: (typeof insumos)[0]) => {
		const { value: cantidad } = await Swal.fire({
			title: `Cantidad: ${insumo.producto_nombre}`,
			input: "number",
			inputValue: insumo.cantidad,
			inputAttributes: { min: "0.01", step: "any" },
			showCancelButton: true,
			confirmButtonColor: "#0d9488",
			confirmButtonText: "Guardar",
			cancelButtonText: "Cancelar",
			inputValidator: (v) => {
				if (!v || Number(v) <= 0) return "La cantidad debe ser mayor a 0";
				return null;
			},
		});

		if (!cantidad || Number(cantidad) === insumo.cantidad) return;

		try {
			await updateInsumo({
				idInsumo: insumo.id_eco_insumo,
				cantidad: Number(cantidad),
				idEco: selectedEco || undefined,
			}).unwrap();
			Swal.fire({ icon: "success", title: "Cantidad actualizada", timer: 1200, showConfirmButton: false });
		} catch (err: any) {
			Swal.fire({ icon: "error", title: "Error", text: err?.data?.message || "No se pudo actualizar" });
		}
	};

	const handleEliminarInsumo = async (insumo: (typeof insumos)[0]) => {
		const result = await Swal.fire({
			title: "¿Eliminar insumo?",
			text: `${insumo.producto_nombre} será removido de la receta.`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#d33",
			confirmButtonText: "Sí, eliminar",
			cancelButtonText: "Cancelar",
		});

		if (!result.isConfirmed) return;

		try {
			await deleteInsumo({
				idInsumo: insumo.id_eco_insumo,
				idEco: selectedEco || undefined,
			}).unwrap();
			Swal.fire({ icon: "success", title: "Insumo eliminado", timer: 1200, showConfirmButton: false });
		} catch (err: any) {
			Swal.fire({ icon: "error", title: "Error", text: err?.data?.message || "No se pudo eliminar" });
		}
	};

	/* ── Loading ── */
	if (loadingEcos) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-lg text-gray-500">Cargando estudios...</div>
			</div>
		);
	}

	return (
		<div className="p-4 md:p-6 space-y-6">
			{/* ── Header ── */}
			<div>
				<h1 className="text-2xl md:text-3xl font-bold text-gray-900">
					Gestor de Consumo por Estudio
				</h1>
				<p className="text-gray-500 mt-1 text-sm">
					Configure los insumos requeridos para cada ecosonograma. El stock se
					validará automáticamente al agendar citas.
				</p>
			</div>

			{/* ── Split Panel ── */}
			<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
				{/* ── Panel izquierdo: lista de ecos ── */}
				<div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
					<div className="p-4 border-b border-gray-200">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<input
								type="text"
								placeholder="Buscar ecosonograma..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
							/>
						</div>
					</div>
					<div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
						{filteredEcos.length === 0 && (
							<div className="p-6 text-center text-gray-400 text-sm">
								No se encontraron estudios
							</div>
						)}
						{filteredEcos.map((eco) => (
							<button
								key={eco.id_eco}
								onClick={() => setSelectedEco(eco.id_eco)}
								className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-gray-50 ${
									selectedEco === eco.id_eco
										? "bg-teal-50 border-l-4 border-teal-600"
										: ""
								}`}
							>
								<div className="flex items-center gap-3 min-w-0">
									<div className="h-9 w-9 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
										<Beaker className="h-4 w-4 text-teal-600" />
									</div>
									<div className="min-w-0">
										<p className="font-medium text-gray-900 text-sm truncate">
											{eco.nombre}
										</p>
										<p className="text-xs text-gray-500">
											{eco.total_insumos} insumo{eco.total_insumos !== 1 ? "s" : ""}
										</p>
									</div>
								</div>
								<ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
							</button>
						))}
					</div>
				</div>

				{/* ── Panel derecho: receta del eco seleccionado ── */}
				<div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
					{!selectedEco ? (
						<div className="flex flex-col items-center justify-center h-80 text-gray-400 space-y-2">
							<Beaker className="h-12 w-12 text-gray-300" />
							<p className="text-sm">Seleccione un ecosonograma para ver su receta</p>
						</div>
					) : (
						<>
							{/* Header del eco */}
							<div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
								<div>
									<h2 className="text-lg font-bold text-gray-900">
										{selectedEcoData?.nombre || "Ecosonograma"}
									</h2>
									<p className="text-xs text-gray-500 mt-0.5">
										Precio: ${Number(selectedEcoData?.precio || 0).toFixed(2)} ·
										Duración: {selectedEcoData?.duracion_min || 0} min
									</p>
								</div>
								<button
									onClick={handleAgregarInsumo}
									className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors shadow-sm font-medium"
								>
									<Plus className="h-4 w-4" />
									Agregar Insumo
								</button>
							</div>

							{/* Tabla de insumos */}
							{loadingInsumos ? (
								<div className="p-6 text-center text-gray-400">Cargando insumos...</div>
							) : insumos.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-60 text-gray-400 space-y-2">
									<Package className="h-10 w-10 text-gray-300" />
									<p className="text-sm">Sin insumos asignados</p>
									<p className="text-xs">
										Agregue los insumos necesarios para este estudio
									</p>
								</div>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead>
											<tr className="bg-gray-50 border-b border-gray-200">
												<th className="text-left px-6 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wider">
													Insumo
												</th>
												<th className="text-center px-6 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wider">
													Cant. por Estudio
												</th>
												<th className="text-center px-6 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wider">
													Stock Actual
												</th>
												<th className="text-center px-6 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wider">
													Estado
												</th>
												<th className="text-right px-6 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wider">
													Acciones
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-100">
											{insumos.map((ins) => {
												const stockOk =
													Number(ins.stock_base_total) >= Number(ins.cantidad);
												return (
													<tr
														key={ins.id_eco_insumo}
														className="hover:bg-gray-50 transition-colors"
													>
														<td className="px-6 py-4 font-medium text-gray-900">
															{ins.producto_nombre}
														</td>
														<td className="px-6 py-4 text-center">
															<button
																onClick={() => handleEditarCantidad(ins)}
																className="inline-flex items-center px-3 py-1 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
															>
																{ins.cantidad}
															</button>
														</td>
														<td className="px-6 py-4 text-center text-gray-700">
															{Number(ins.stock_base_total)}
														</td>
														<td className="px-6 py-4 text-center">
															{stockOk ? (
																<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
																	<CheckCircle2 className="h-3 w-3" />
																	Disponible
																</span>
															) : (
																<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
																	<AlertTriangle className="h-3 w-3" />
																	Sin stock
																</span>
															)}
														</td>
														<td className="px-6 py-4 text-right">
															<button
																onClick={() => handleEliminarInsumo(ins)}
																className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
																title="Eliminar"
															>
																<Trash2 className="h-4 w-4" />
															</button>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
