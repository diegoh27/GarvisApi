import { useState, useEffect, useMemo } from "react";
import { X, PackagePlus, DollarSign, Trash2, Edit2, Save, XCircle, Search } from "lucide-react";
import Swal from "sweetalert2";
import {
	useGetProveedorCatalogoQuery,
	useAsociarProductoCatalogoMutation,
	useUpdateCostoCatalogoMutation,
	useDeleteProductoCatalogoMutation,
	type Proveedor,
	type RelacionCatalogo,
} from "../api/proveedoresApi";
import { useGetProductosQuery } from "../api/productosApi";
import { useGetDolarOficialQuery } from "../../dolar/dolarApi";

interface CatalogoProveedorModalProps {
	isOpen: boolean;
	onClose: () => void;
	proveedor: Proveedor | null;
}

export default function CatalogoProveedorModal({
	isOpen,
	onClose,
	proveedor,
}: CatalogoProveedorModalProps) {
	// API Queries & Mutations
	const { data: catalogo = [], isLoading: isLoadingCatalogo } = useGetProveedorCatalogoQuery(
		proveedor?.id_proveedor || "",
		{ skip: !proveedor || !isOpen }
	);
	const { data: productos = [] } = useGetProductosQuery(undefined, { skip: !isOpen });
	const { data: dolarOficial } = useGetDolarOficialQuery();

	const [asociarProducto, { isLoading: isAsociando }] = useAsociarProductoCatalogoMutation();
	const [updateCosto, { isLoading: isActualizando }] = useUpdateCostoCatalogoMutation();
	const [deleteAsociacion, { isLoading: isBorrando }] = useDeleteProductoCatalogoMutation();

	// Local State
	const [selectedProducto, setSelectedProducto] = useState("");
	const [precioCosto, setPrecioCosto] = useState("");
	const [precioCostoBs, setPrecioCostoBs] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingPrecio, setEditingPrecio] = useState("");

	// Dropdown and Search Logic
	const [searchQuery, setSearchQuery] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	useEffect(() => {
		if (!isOpen) {
			setSelectedProducto("");
			setPrecioCosto("");
			setPrecioCostoBs("");
			setEditingId(null);
			setSearchQuery("");
			setIsDropdownOpen(false);
		}
	}, [isOpen]);

	// Productos disponibles para asociar (que no estén ya en el catálogo)
	const productosDisponibles = useMemo(() => {
		const asociadosSet = new Set(catalogo.map(c => c.id_producto));
		return productos.filter((p: any) => !asociadosSet.has(p.id_producto) && p.activo === 1);
	}, [productos, catalogo]);

	// Productos filtrados en el buscador
	const productosFiltrados = useMemo(() => {
		if (!searchQuery) return productosDisponibles;
		return productosDisponibles.filter((p: any) => 
			p.nombre.toLowerCase().includes(searchQuery.toLowerCase())
		);
	}, [productosDisponibles, searchQuery]);
	const formatCurrency = (val: number | string) => {
		return Number(val).toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	};

	const handleAsociar = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!proveedor) return;
		if (!selectedProducto) return Swal.fire("Error", "Debes seleccionar un producto", "warning");

		try {
			await asociarProducto({
				id_proveedor: proveedor.id_proveedor,
				id_producto: selectedProducto,
				precio_costo: Number(precioCosto) || 0,
			}).unwrap();

			Swal.fire({
				toast: true,
				position: "top-end",
				icon: "success",
				title: "Producto vinculado",
				showConfirmButton: false,
				timer: 1500,
			});
			setSelectedProducto("");
			setSearchQuery("");
			setPrecioCosto("");
			setPrecioCostoBs("");
		} catch (err: any) {
			Swal.fire("Error", err?.data?.message || "Error al vincular el producto", "error");
		}
	};

	const startEditing = (relacion: RelacionCatalogo) => {
		setEditingId(relacion.id_relacion);
		setEditingPrecio(relacion.precio_costo.toString());
	};

	const cancelEditing = () => {
		setEditingId(null);
		setEditingPrecio("");
	};

	const handleSaveCosto = async (relacion: RelacionCatalogo) => {
		if (!proveedor) return;
		try {
			await updateCosto({
				id_proveedor: proveedor.id_proveedor,
				id_relacion: relacion.id_relacion,
				precio_costo: Number(editingPrecio) || 0,
			}).unwrap();

			setEditingId(null);
			Swal.fire({
				toast: true,
				position: "top-end",
				icon: "success",
				title: "Costo actualizado",
				showConfirmButton: false,
				timer: 1500,
			});
		} catch (err: any) {
			Swal.fire("Error", err?.data?.message || "Error al actualizar costo", "error");
		}
	};

	const handleDesvincular = async (relacion: RelacionCatalogo) => {
		if (!proveedor) return;

		const res = await Swal.fire({
			title: "¿Desvincular producto?",
			text: `El producto "${relacion.producto_nombre}" será desvinculado de este proveedor.`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#d33",
			cancelButtonColor: "#3085d6",
			confirmButtonText: "Sí, desvincular",
			cancelButtonText: "Cancelar"
		});

		if (res.isConfirmed) {
			try {
				await deleteAsociacion({
					id_proveedor: proveedor.id_proveedor,
					id_relacion: relacion.id_relacion,
				}).unwrap();
				Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Producto desvinculado', timer: 1500, showConfirmButton: false });
			} catch (err: any) {
				Swal.fire("Error", err?.data?.message || "Error al desvincular", "error");
			}
		}
	};

	// Handlers para input de costos calculados
	const handleCostoUsdChange = (val: string) => {
		setPrecioCosto(val);
		if (dolarOficial?.promedio && val) {
			setPrecioCostoBs((Number(val) * dolarOficial.promedio).toFixed(2));
		} else {
			setPrecioCostoBs("");
		}
	};

	const handleCostoBsChange = (val: string) => {
		setPrecioCostoBs(val);
		if (dolarOficial?.promedio && val) {
			setPrecioCosto((Number(val) / dolarOficial.promedio).toFixed(2));
		} else {
			setPrecioCosto("");
		}
	};

	if (!isOpen || !proveedor) return null;

	const inputClassName = "w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006965] focus:bg-white transition-colors placeholder-slate-400";

	return (
		<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
				{/* Header */}
				<div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center text-[#006965]">
							<PackagePlus size={20} />
						</div>
						<div>
							<h2 className="text-xl font-bold text-slate-800">Catálogo de {proveedor.nombre}</h2>
							<p className="text-xs text-slate-500 font-medium">Asocia productos y establece su costo de compra</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				{/* Body Content */}
				<div className="flex-1 overflow-y-auto bg-slate-50 p-6">
					
					{/* Panel Superior: Vincular Nuevo */}
					<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
						<h3 className="text-sm font-bold text-slate-700 mb-4">Vincular Nuevo Producto</h3>
						<form onSubmit={handleAsociar} className="flex flex-col md:flex-row gap-4 items-end">
							<div className="flex-1 relative">
								<label className="block text-xs font-semibold text-slate-500 mb-1">Producto</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<Search size={14} className="text-slate-400" />
									</div>
									<input
										type="text"
										value={searchQuery}
										onChange={(e) => {
											setSearchQuery(e.target.value);
											setSelectedProducto("");
											setIsDropdownOpen(true);
										}}
										onFocus={() => setIsDropdownOpen(true)}
										onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
										placeholder="Buscar o seleccionar producto..."
										className={`${inputClassName} pl-8`}
										required
									/>
								</div>
								
								{/* Dropdown flotante */}
								{isDropdownOpen && (
									<div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto z-20">
										{productosFiltrados.length === 0 ? (
											<div className="p-3 text-sm text-slate-500 text-center">No se encontraron productos</div>
										) : (
											productosFiltrados.map((p: any) => (
												<button
													key={p.id_producto}
													type="button"
													onClick={() => {
														setSelectedProducto(p.id_producto);
														setSearchQuery(p.nombre);
														setIsDropdownOpen(false);
													}}
													className="w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50 hover:text-[#006965] border-b border-slate-100 last:border-0 transition-colors font-medium text-slate-700"
												>
													{p.nombre}
												</button>
											))
										)}
									</div>
								)}
							</div>
							
							<div className="w-full md:w-40">
								<label className="block text-xs font-semibold text-slate-500 mb-1">Costo (USD)</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<DollarSign size={14} className="text-slate-400" />
									</div>
									<input
										type="number"
										step="any"
										min="0"
										value={precioCosto}
										onChange={(e) => handleCostoUsdChange(e.target.value)}
										className={`${inputClassName} pl-8`}
										placeholder="0.00"
										required
									/>
								</div>
							</div>

							<div className="w-full md:w-40">
								<label className="block text-xs font-semibold text-slate-500 mb-1">Costo (Bs)</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm font-medium">
										Bs
									</div>
									<input
										type="number"
										step="any"
										min="0"
										value={precioCostoBs}
										onChange={(e) => handleCostoBsChange(e.target.value)}
										className={`${inputClassName} pl-9`}
										placeholder="0.00"
										required
									/>
								</div>
							</div>

							<button
								type="submit"
								disabled={isAsociando || !selectedProducto}
								className="w-full md:w-auto px-6 py-2 bg-[#006965] hover:bg-teal-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 h-[38px] flex items-center justify-center gap-2"
							>
								{isAsociando ? "Vinculando..." : "Vincular"}
							</button>
						</form>
					</div>

					{/* Lista de asociados */}
					<div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
						<div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-gray-50/50">
							<h3 className="text-sm font-bold text-slate-700">Productos Vinculados ({catalogo.length})</h3>
						</div>

						{isLoadingCatalogo ? (
							<div className="p-8 text-center text-slate-500 text-sm">Cargando catálogo...</div>
						) : catalogo.length === 0 ? (
							<div className="p-10 text-center flex flex-col items-center gap-2 text-slate-500">
								<PackagePlus size={32} className="text-slate-300" />
								<p className="text-sm font-medium">Este proveedor aún no tiene productos vinculados.</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-sm text-left">
									<thead className="bg-slate-50 text-xs text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
										<tr>
											<th className="px-6 py-3">Producto</th>
											<th className="px-6 py-3">Categoría</th>
											<th className="px-6 py-3">Costo Base</th>
											<th className="px-6 py-3">Última Actualización</th>
											<th className="px-6 py-3 text-right">Acciones</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100">
										{catalogo.map((item) => (
											<tr key={item.id_relacion} className="hover:bg-slate-50/50 transition-colors">
												<td className="px-6 py-3.5 font-semibold text-slate-800">
													{item.producto_nombre}
												</td>
												<td className="px-6 py-3.5 text-slate-500 text-xs font-medium">
													{item.producto_categoria || 'N/A'}
												</td>
												<td className="px-6 py-3.5">
													{editingId === item.id_relacion ? (
														<div className="flex items-center gap-2">
															<input
																type="number"
																step="any"
																className="w-24 px-2 py-1 text-sm border-2 border-teal-500 rounded focus:outline-none"
																value={editingPrecio}
																onChange={(e) => setEditingPrecio(e.target.value)}
																autoFocus
															/>
															<button onClick={() => handleSaveCosto(item)} disabled={isActualizando} className="text-teal-600 hover:text-teal-800">
																<Save size={16} />
															</button>
															<button onClick={cancelEditing} className="text-slate-400 hover:text-slate-600">
																<XCircle size={16} />
															</button>
														</div>
													) : (
														<span className="font-bold text-[#006965]">
															${formatCurrency(item.precio_costo)}
														</span>
													)}
												</td>
												<td className="px-6 py-3.5 text-slate-400 text-xs">
													{new Date(item.fecha_actualizacion).toLocaleString()}
												</td>
												<td className="px-6 py-3.5 text-right flex items-center justify-end gap-3">
													{editingId !== item.id_relacion && (
														<>
															<button
																onClick={() => startEditing(item)}
																className="text-slate-400 hover:text-teal-600 transition-colors tooltip tooltip-left"
																title="Editar costo"
															>
																<Edit2 size={16} />
															</button>
															<button
																onClick={() => handleDesvincular(item)}
																disabled={isBorrando}
																className="text-slate-400 hover:text-red-500 transition-colors"
																title="Desvincular"
															>
																<Trash2 size={16} />
															</button>
														</>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>

			</div>
		</div>
	);
}
