import { useState, useMemo } from "react";
import { Package, Plus, Trash2, FileText } from "lucide-react";
import Swal from "sweetalert2";
import { useGetProductosQuery } from "../api/productosApi";
import { useGetCatalogoGlobalQuery } from "../api/proveedoresApi";
import { useGetDolarOficialQuery } from "../../dolar";
import { useCreateOrdenCompraMutation } from "../api/ordenesCompraApi";
import { useNavigate } from "react-router-dom";

interface DetalleTemp {
	id_producto: string;
	producto_nombre: string;
	id_proveedor: string;
	proveedor_nombre: string;
	cantidad_ordenada: number;
	precio_unitario_acordado: number;
	unidad_compra: string;
	factor_conversion: number;
}

export default function CrearOrdenCompraPage() {
	const navigate = useNavigate();
	const today = new Date().toISOString().split("T")[0];

	// API Queries
	const { data: allProductos = [] } = useGetProductosQuery();
	const { data: catalogoGlobal = [], isLoading: loadingCatalogo } = useGetCatalogoGlobalQuery();
	const { data: dolarOficial } = useGetDolarOficialQuery();
	const [createOrden, { isLoading: isGenerando }] = useCreateOrdenCompraMutation();
	
	const tasaBcv = Number(dolarOficial?.promedio) || 0;

	// State cabecera
	const [fechaEmision, setFechaEmision] = useState(today);

	// State detalle temporal (Carrito)
	const [detalles, setDetalles] = useState<DetalleTemp[]>([]);
	
	// State input temporal detalle
	const [selectedProducto, setSelectedProducto] = useState("");
	const [selectedProveedor, setSelectedProveedor] = useState("");
	const [cantidad, setCantidad] = useState("");
	const [precioUnitario, setPrecioUnitario] = useState("");

	// Handlers
	const handleProductoSelect = (id_prod: string) => {
		setSelectedProducto(id_prod);
		setSelectedProveedor(""); // Reiniciar proveedor al cambiar producto
		setCantidad("");
		setPrecioUnitario("");
	};

	// Lista de proveedores que venden el producto seleccionado
	const proveedoresDisponibles = useMemo(() => {
		if (!selectedProducto) return [];
		return catalogoGlobal.filter((c: any) => String(c.id_producto) === String(selectedProducto));
	}, [selectedProducto, catalogoGlobal]);

	const handleProveedorSelect = (id_prov: string) => {
		setSelectedProveedor(id_prov);
		const rel = proveedoresDisponibles.find((c: any) => String(c.id_proveedor) === String(id_prov));
		if (rel) {
			setPrecioUnitario(String(rel.precio_costo));
		}
	};

	const productoSeleccionadoInfo = useMemo(() => {
		return allProductos.find((p: any) => String(p.id_producto) === String(selectedProducto));
	}, [selectedProducto, allProductos]);

	const handleAddDetalle = () => {
		if (!selectedProducto || !selectedProveedor || !cantidad || Number(cantidad) <= 0 || !precioUnitario || Number(precioUnitario) <= 0) {
			Swal.fire("Incompleto", "Por favor selecciona producto, proveedor y completa cantidad/precio.", "warning");
			return;
		}

		if (!productoSeleccionadoInfo) return;
		
		// Proveedor name
		const provInfo = proveedoresDisponibles.find((p: any) => String(p.id_proveedor) === String(selectedProveedor));
		
		// Validar que no hayamos agregado este mismo producto con otro (o el mismo) proveedor
		if (detalles.some(d => String(d.id_producto) === String(selectedProducto))) {
			Swal.fire("Atención", "Este producto ya está en el carrito. Elimínalo si deseas cambiar la cantidad o de proveedor.", "warning");
			return;
		}

		setDetalles(prev => [...prev, {
			id_producto: productoSeleccionadoInfo.id_producto,
			producto_nombre: productoSeleccionadoInfo.nombre,
			id_proveedor: selectedProveedor,
			proveedor_nombre: provInfo?.proveedor_nombre || "Desconocido",
			cantidad_ordenada: Number(cantidad),
			precio_unitario_acordado: Number(precioUnitario),
			unidad_compra: productoSeleccionadoInfo.unidad_compra || 'Und',
			factor_conversion: Number(productoSeleccionadoInfo.factor_conversion || 1)
		}]);

		setSelectedProducto("");
		setSelectedProveedor("");
		setCantidad("");
		setPrecioUnitario("");
	};

	const deleteDetalle = (id_producto: string) => {
		setDetalles(prev => prev.filter(d => d.id_producto !== id_producto));
	};

	const totalOrden = detalles.reduce((acc, obj) => acc + (obj.cantidad_ordenada * obj.precio_unitario_acordado), 0);

	const handleGenerarOrden = async () => {
		if (detalles.length === 0) {
			return Swal.fire("Incompleto", "No hay productos en el carrito.", "warning");
		}

		// Agrupar por proveedor
		const ordenesPorProveedor = detalles.reduce((acc, d) => {
			if (!acc[d.id_proveedor]) acc[d.id_proveedor] = [];
			acc[d.id_proveedor].push({
				id_producto: d.id_producto,
				cantidad_ordenada: d.cantidad_ordenada,
				precio_unitario_acordado: d.precio_unitario_acordado
			});
			return acc;
		}, {} as Record<string, any[]>);

		try {
			const promesas = Object.entries(ordenesPorProveedor).map(([id_prov, deta]) => {
				return createOrden({
					id_proveedor: id_prov,
					fecha_emision: fechaEmision,
					detalles: deta
				}).unwrap();
			});

			await Promise.all(promesas);

			await Swal.fire({
				title: "¡Órdenes Creadas!",
				text: `Se han generado ${promesas.length} órden(es) de compra en Stand By exitosamente.`,
				icon: "success",
				confirmButtonColor: "#006965"
			});
			navigate("/inventario");
		} catch (err: any) {
			Swal.fire("Error", err?.data?.message || "Ocurrió un error al crear las órdenes de compra.", "error");
		}
	};

	const inputClass = "w-full border border-slate-200 rounded-lg bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-medium text-slate-700";
	const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block";

	return (
		<div className="w-full p-4 md:p-6 flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<div className="h-12 w-12 rounded-xl bg-teal-50 text-[#006965] border border-teal-100 flex items-center justify-center">
					<Package size={24} />
				</div>
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-800">Generar Orden de Compra</h1>
					<p className="text-sm font-medium text-slate-500">
						Los items estarán en "Stand By" hasta ser formalmente recibidos. No alteran el stock físico.
					</p>
				</div>
			</div>

			<div className="flex flex-col gap-6">
				
				<div className="w-full flex flex-col gap-6">
					
					{/* LA CABECERA ESTÁ EN ESTADO INVISIBLE (Se guardan los datos pero no se muestran) */}
					<div className="hidden">
						<input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} />
					</div>
					
					{/* PARTE B: AGREGAR PRODUCTOS */}
					<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
						<div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
							<Package size={18} className="text-slate-400" />
							<h3 className="font-bold text-slate-700 text-sm">Agregar Productos (Catálogo)</h3>
						</div>
						
						<div className="p-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_100px_100px_90px_40px] gap-3 items-end">
							{/* Producto */}
							<div>
								<label className={labelClass}>Producto Libre</label>
								<select 
									className={inputClass}
									value={selectedProducto}
									onChange={(e) => handleProductoSelect(e.target.value)}
								>
									<option value="" disabled>1. Busque un producto...</option>
									{allProductos.filter((p: any) => p.activo === 1 && !detalles.some(d => String(d.id_producto) === String(p.id_producto))).map((p: any) => (
										<option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
									))}
								</select>
							</div>

							{/* Proveedor inteligente */}
							<div>
								<label className={labelClass}>Comprar a...</label>
								<select 
									className={inputClass}
									value={selectedProveedor}
									onChange={(e) => handleProveedorSelect(e.target.value)}
									disabled={!selectedProducto || loadingCatalogo || proveedoresDisponibles.length === 0}
								>
									<option value="" disabled>
										{!selectedProducto ? "Gris: Elija producto" : proveedoresDisponibles.length === 0 ? "⚠️ Nadie vende esto" : "2. Elija un proveedor"}
									</option>
									{proveedoresDisponibles.map((p: any) => (
										<option key={p.id_proveedor} value={p.id_proveedor}>
											{p.proveedor_nombre} - Base: ${Number(p.precio_costo).toFixed(2)}
										</option>
									))}
								</select>
							</div>

							{/* Costo USD */}
							<div>
								<label className={labelClass}>Costo ($)</label>
								<div className="flex items-center border border-slate-200 bg-white rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-teal-500">
									<span className="bg-slate-50 px-2 py-2.5 text-xs text-slate-500 border-r border-slate-200 shrink-0">$</span>
									<input 
										type="number" step="any" min="0"
										value={precioUnitario}
										onChange={(e) => setPrecioUnitario(e.target.value)}
										className="w-full min-w-0 px-2 py-2.5 text-sm outline-none text-slate-700"
										placeholder="0.00"
									/>
								</div>

								{/* Costo Bs */}
								</div>
								<div>
									<label className={labelClass}>Costo (Bs)</label>
									<div className="flex items-center border border-slate-200 bg-white rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-teal-500">
										<span className="bg-slate-50 px-2 py-2.5 text-xs text-slate-500 border-r border-slate-200 shrink-0">Bs</span>
									<input 
										type="number" step="any" min="0"
										value={tasaBcv > 0 && Number(precioUnitario) > 0 ? Number((Number(precioUnitario) * tasaBcv).toFixed(2)) : ""}
										onChange={(e) => {
											const v = Number(e.target.value);
											if (tasaBcv > 0) setPrecioUnitario(String(v / tasaBcv));
										}}
										disabled={tasaBcv <= 0}
										className="w-full min-w-0 px-2 py-2.5 text-sm outline-none text-slate-700 disabled:bg-slate-50"
										placeholder={tasaBcv > 0 ? "0.00" : "—"}
									/>
								</div>
							</div>

							{/* Cantidad */}
							<div>
								<label className={labelClass}>{productoSeleccionadoInfo?.unidad_compra || 'Cant.'}</label>
								<input 
									type="number"
									min="1"
									value={cantidad}
									onChange={(e) => setCantidad(e.target.value)}
									className={inputClass}
									placeholder="0"
								/>
								{productoSeleccionadoInfo && cantidad && Number(cantidad) > 0 && (
									<p className="mt-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
										≈ {Number(cantidad) * Number(productoSeleccionadoInfo.factor_conversion)} {productoSeleccionadoInfo.unidad_consumo}
									</p>
								)}
							</div>

							{/* Botón */}
							<div>
								<button 
									type="button"
									onClick={handleAddDetalle}
									disabled={!selectedProveedor}
									className="h-10 w-10 flex items-center justify-center bg-[#006965] hover:bg-teal-800 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
									title="Añadir producto"
								>
									<Plus size={18} />
								</button>
							</div>
						</div>
					</div>

					{/* PARTE C: TABLA DE DETALLES TEMPORALES */}
					<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1">
						<div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
							<h3 className="font-bold text-slate-700 text-sm">Resumen de Orden</h3>
							<span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">{detalles.length} Items</span>
						</div>

						{detalles.length === 0 ? (
							<div className="p-12 flex flex-col items-center justify-center text-slate-400">
								<Package size={32} className="mb-3 opacity-50" />
								<p className="text-sm font-medium">Aún no has agregado productos a la orden.</p>
							</div>
						) : (
							<div className="overflow-x-auto flex-1">
								<table className="w-full text-sm text-left whitespace-nowrap">
									<thead className="bg-slate-50 text-xs text-slate-500 font-bold uppercase border-b border-slate-100">
										<tr>
											<th className="px-5 py-3">Producto</th>
											<th className="px-5 py-3">Vendedor Asignado</th>
											<th className="px-5 py-3">Cantidad</th>
											<th className="px-5 py-3 text-right">Precio Unit. (USD)</th>
											<th className="px-5 py-3 text-right">Subtotal</th>
											<th className="px-5 py-3 text-right">Acción</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100">
										{detalles.map((d, idx) => (
											<tr key={idx} className="hover:bg-slate-50 transition-colors">
												<td className="px-5 py-3.5 font-semibold text-slate-700">{d.producto_nombre}</td>
												<td className="px-5 py-3.5 text-slate-500 font-medium text-xs uppercase tracking-wide">
													{d.proveedor_nombre}
												</td>
												<td className="px-5 py-3.5 text-slate-600 font-medium">
													{d.cantidad_ordenada} <span className="text-xs text-slate-400">({d.unidad_compra})</span>
												</td>
												<td className="px-5 py-3.5 text-right font-medium text-slate-600">
													${d.precio_unitario_acordado.toLocaleString("en-US", { minimumFractionDigits: 2 })}
												</td>
												<td className="px-5 py-3.5 text-right font-bold text-[#006965]">
													${(d.cantidad_ordenada * d.precio_unitario_acordado).toLocaleString("en-US", { minimumFractionDigits: 2 })}
												</td>
												<td className="px-5 py-3.5 text-right">
													<button
														type="button"
														onClick={() => deleteDetalle(d.id_producto)}
														className="text-slate-400 hover:text-red-500 transition-colors tooltip tooltip-left"
														title="Quitar"
													>
														<Trash2 size={16} />
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}

						{/* FOOTER: TOTALES Y GENERAR */}
						<div className="bg-slate-50 border-t border-slate-200 p-5 flex flex-col md:flex-row justify-between items-center gap-4">
							<div className="flex flex-col items-center md:items-start text-slate-600 bg-white px-6 py-3 border border-slate-200 rounded-xl shadow-sm">
								<span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Gran Total de la Orden</span>
								<div className="flex items-center gap-3">
									<div className="text-2xl font-black text-slate-800">
										${totalOrden.toLocaleString("en-US", { minimumFractionDigits: 2 })}
									</div>
									{tasaBcv > 0 && (
										<>
											<span className="text-slate-300">|</span>
											<div className="text-sm font-bold text-slate-500">
												Bs {(totalOrden * tasaBcv).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
											</div>
										</>
									)}
								</div>
							</div>
							
							<button
								onClick={handleGenerarOrden}
								disabled={detalles.length === 0 || isGenerando}
								className={`
									px-8 py-3.5 rounded-xl font-bold text-white shadow-md transition-all
									flex items-center gap-2
									${detalles.length === 0 || isGenerando 
										? 'bg-slate-300 cursor-not-allowed shadow-none' 
										: 'bg-[#006965] hover:bg-teal-800 hover:shadow-lg active:scale-[0.98]'
									}
								`}
							>
								{isGenerando ? (
									<span>Procesando Orden...</span>
								) : (
									<>
										<FileText size={18} />
										<span>Generar Orden de Compra</span>
									</>
								)}
							</button>
						</div>
					</div>

				</div>
			</div>
		</div>
	);
}
