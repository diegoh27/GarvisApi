import { useState, useEffect } from "react";
import { X, FileText, PackageCheck, AlertCircle, TrendingUp, TrendingDown, Printer } from "lucide-react";
import Swal from "sweetalert2";
import { generateTableReport } from "../../../utils/generateTableReport";
import { pluralizarUnidad } from "../../../utils/pluralizar";
import { 
	useGetOrdenCompraByIdQuery, 
	useProcesarRecepcionOrdenMutation,
	type OrdenCompra
} from "../api/ordenesCompraApi";
import { useGetDolarOficialQuery } from "../../dolar";

interface RecepcionCompraModalProps {
	orden: OrdenCompra;
	onClose: () => void;
}

export default function RecepcionCompraModal({ orden, onClose }: RecepcionCompraModalProps) {
	// 1) Fetch Order Details
	const { data: ordenCompleta, isLoading: isLoadingOrden } = useGetOrdenCompraByIdQuery(orden.id_orden);
	const [procesarRecepcion, { isLoading: isProcesando }] = useProcesarRecepcionOrdenMutation();
	const { data: dolarOficial } = useGetDolarOficialQuery();
	
	const tasaBcv = Number(dolarOficial?.promedio) || 0;

	// 2) State for Editable Lines
	const [lineas, setLineas] = useState<{ id_producto: string; cantidad: number; precio_unitario: number; origin_precio: number }[]>([]);
	const [factura, setFactura] = useState("");
	const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);

	// Initialize lines when data is loaded (from full order fetch)
	useEffect(() => {
		const detalles = ordenCompleta?.detalles;
		if (detalles && detalles.length > 0) {
			setLineas(detalles.map(d => ({
				id_producto: d.id_producto,
				cantidad: d.cantidad_ordenada || 0,
				precio_unitario: Number(d.precio_unitario_acordado) || 0,
				origin_precio: Number(d.precio_unitario_acordado) || 0
			})));
		}
	}, [ordenCompleta?.detalles?.length]); // Evitar re-runs innecesarios

	// Calculations
	const subtotal = lineas.reduce((acc, l) => acc + (l.cantidad * l.precio_unitario), 0);
	const impuesto = subtotal * 0.16;
	const total = subtotal + impuesto;

	// Handlers
	const handleLineChange = (index: number, field: "cantidad" | "precio_unitario", value: string) => {
		const newLines = [...lineas];
		newLines[index][field] = Number(value);
		setLineas(newLines);
	};

	const handleBsPriceChange = (index: number, valueBs: string) => {
		if (tasaBcv <= 0) return;
		const newLines = [...lineas];
		newLines[index].precio_unitario = Number(valueBs) / tasaBcv;
		setLineas(newLines);
	};

	const handleSubmit = async () => {
		if (!factura.trim()) {
			return Swal.fire("Atención", "Debe ingresar el número de factura de compra.", "warning");
		}
		// Usar lineas del state, o tomar las del ordenCompleta si el state no fue inicializado todavía
		const lineasEnvio = lineas.length > 0 
			? lineas 
			: (ordenCompleta?.detalles || []).map(d => ({
				id_producto: d.id_producto,
				cantidad: d.cantidad_ordenada || 0,
				precio_unitario: Number(d.precio_unitario_acordado) || 0,
				origin_precio: Number(d.precio_unitario_acordado) || 0
			}));

		if (lineasEnvio.length === 0) {
			return Swal.fire("Error", "No hay líneas de productos. Espere que carguen los detalles de la orden.", "warning");
		}
		if (lineasEnvio.some(l => l.cantidad <= 0 || l.precio_unitario <= 0)) {
			return Swal.fire("Atención", "Existen líneas con cantidad o precio inválido.", "warning");
		}

		try {
			await procesarRecepcion({
				id_orden: orden.id_orden,
				numero_factura: factura,
				fecha_compra: fecha,
				observaciones: `Recepción de Orden ${orden.numero_orden}`,
				lineas: lineasEnvio.map(l => ({
					id_producto: l.id_producto,
					cantidad: l.cantidad,
					precio_unitario: l.precio_unitario
				}))
			}).unwrap();

			await Swal.fire("¡Éxito!", "Se procesó la recepción. La nota de compra fue generada, el Kardex y el inventario han sido actualizados.", "success");
			onClose();
		} catch (err: any) {
			Swal.fire("Error", err?.data?.message || "Ocurrió un error al procesar recepción", "error");
		}
	};

	const handlePrint = async () => {
		const detalles = ordenCompleta?.detalles;
		if (!detalles || detalles.length === 0) {
			return Swal.fire("Atenci\u00f3n", "No hay detalles cargados para imprimir.", "warning");
		}

		const tableData = detalles.map((d, i) => {
			const linea = lineas[i];
			const pu = linea ? linea.precio_unitario : Number(d.precio_unitario_acordado);
			const cant = linea ? linea.cantidad : d.cantidad_ordenada;
			const sub = pu * cant;
			return [
				d.producto_nombre || "-",
				d.unidad_compra || "-",
				String(cant),
				`$${pu.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
				`$${sub.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
				tasaBcv > 0 ? `Bs ${(sub * tasaBcv).toLocaleString("es-VE", { minimumFractionDigits: 2 })}` : "-"
			];
		});

		const subtotalCalc = lineas.length > 0
			? lineas.reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0)
			: detalles.reduce((acc, d) => acc + Number(d.precio_unitario_acordado) * d.cantidad_ordenada, 0);
		const totalConIva = subtotalCalc * 1.16;
		const totalBs = tasaBcv > 0 ? ` | Bs ${(totalConIva * tasaBcv).toLocaleString("es-VE", { minimumFractionDigits: 2 })}` : "";

		await generateTableReport({
			title: "FACTURA DE COMPRA",
			subtitle: `Orden de Compra: ${orden.numero_orden}`,
			reportInfo: [
				{ label: "Proveedor", value: orden.proveedor_nombre || "-" },
				{ label: "N\u00b0 Orden", value: orden.numero_orden },
				{ label: "Fecha", value: new Date(orden.fecha_emision).toLocaleDateString("es-VE") },
				{ label: "Estado", value: orden.estado },
			],
			extraInfo: [
				{ label: "Subtotal", value: `$${subtotalCalc.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
				{ label: "IVA (16%)", value: `$${(subtotalCalc * 0.16).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
				{ label: "Tasa BCV", value: tasaBcv > 0 ? `Bs ${tasaBcv.toFixed(2)}` : "N/D" },
			],
			tableHeaders: ["Producto", "Unidad", "Cantidad", "Precio USD", "Subtotal USD", "Subtotal Bs"],
			tableData,
			total: `$${totalConIva.toLocaleString("en-US", { minimumFractionDigits: 2 })}${totalBs}`,
			filename: `Factura_Compra_${orden.numero_orden}.pdf`,
		});
	};


	if (isLoadingOrden) {
		return (
			<div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
				<div className="bg-white rounded-2xl w-full max-w-lg p-10 flex flex-col items-center shadow-xl">
					<div className="h-10 w-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4" />
					<p className="text-slate-600 font-bold">Cargando detalles de orden...</p>
				</div>
			</div>
		);
	}


	return (
		<div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6 overflow-y-auto">
			<div className="bg-slate-50 w-full max-w-6xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
				
				{/* ─ HEADER Modal ─ */}
				<div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
					<div className="flex items-center gap-4">
						<div className="h-12 w-12 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100 shadow-sm">
							<PackageCheck size={24} />
						</div>
						<div>
							<h2 className="text-xl font-black text-slate-800">Procesar Recepción de Compra</h2>
							<p className="text-base font-medium text-slate-500 flex items-center gap-2">
								<span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">{orden.numero_orden}</span>
								<span>• {orden.proveedor_nombre}</span>
							</p>
						</div>
					</div>
					<button 
						type="button" 
						onClick={onClose}
						className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				{/* ─ BODY Modal ─ */}
				<div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
					
					{/* Cabecera / Info de Factura */}
					<div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6">
						<div className="flex-1">
							<label className="text-base font-bold text-slate-500 uppercase tracking-wider mb-2 block">
								Nº de Factura del Proveedor <span className="text-red-500">*</span>
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<FileText size={16} className="text-slate-400" />
								</div>
								<input 
									type="text" 
									value={factura}
									onChange={(e) => setFactura(e.target.value)}
									className="w-full border border-slate-200 rounded-lg bg-slate-50 pl-10 pr-4 py-2.5 text-base outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-bold text-slate-800"
									placeholder="F-000000"
								/>
							</div>
						</div>
						<div className="flex-1">
							<label className="text-base font-bold text-slate-500 uppercase tracking-wider mb-2 block">
								Fecha de Recepción
							</label>
							<input 
								type="date"
								value={fecha}
								onChange={(e) => setFecha(e.target.value)}
								className="w-full border border-slate-200 rounded-lg bg-slate-50 px-4 py-2.5 text-base outline-none focus:border-teal-500 transition-all text-slate-700"
							/>
						</div>
					</div>

					{/* Tabla Editable */}
					<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
						<div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
							<h3 className="font-bold text-slate-700 text-base">Validación de Items (Pre-cargados)</h3>
						</div>
						
						<div className="overflow-x-auto">
							<table className="w-full text-base text-left">
								<thead className="bg-white text-base text-slate-400 font-bold uppercase border-b border-slate-100">
									<tr>
										<th className="px-4 py-4">Producto</th>
										<th className="px-4 py-4 w-24">Und</th>
										<th className="px-4 py-4 w-40 text-center">Precio USD ($)</th>
										<th className="px-4 py-4 w-40 text-center">Precio Bs</th>
										<th className="px-4 py-4 text-center w-28">Variación</th>
										<th className="px-4 py-4 text-center w-28">Variación Bs</th>
										<th className="px-4 py-4 text-right">Subtotal</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{ordenCompleta?.detalles?.map((d, i) => {
										const currentLine = lineas[i];
										if (!currentLine) return null;
										
										const diff = currentLine.precio_unitario - currentLine.origin_precio;
										const sumUsd = currentLine.cantidad * currentLine.precio_unitario;
										const precioBs = tasaBcv > 0 ? currentLine.precio_unitario * tasaBcv : 0;
										const sumBs = sumUsd * tasaBcv;

										return (
											<tr key={d.id_producto} className="hover:bg-slate-50 transition-colors">
												<td className="px-4 py-4">
													<p className="font-bold text-slate-700">{d.producto_nombre}</p>
													{d.presentacion && <p className="text-base text-slate-400 mt-0.5">{d.presentacion}</p>}
													<p className="text-base text-teal-600 font-semibold mt-0.5">
														{pluralizarUnidad(d.unidad_compra || "", currentLine.cantidad)}
													</p>
												</td>
												<td className="px-4 py-4">
													<input 
														type="number"
														min="1"
														value={currentLine.cantidad}
														onChange={(e) => handleLineChange(i, "cantidad", e.target.value)}
														className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none font-bold text-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-200 text-center"
													/>
												</td>
												{/* Precio USD — editable */}
												<td className="px-4 py-4">
													<div className="flex items-center">
														<span className="text-slate-400 bg-slate-100 border border-r-0 border-slate-300 rounded-l px-2 py-2 font-bold text-base">$</span>
														<input 
															type="number"
															step="0.01"
															min="0"
															value={currentLine.precio_unitario}
															onChange={(e) => handleLineChange(i, "precio_unitario", e.target.value)}
															className="w-full border border-slate-300 rounded-r px-2 py-2 outline-none font-bold text-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-200 text-right"
														/>
													</div>
												</td>
												{/* Precio Bs — editable, sincronizado con USD */}
												<td className="px-4 py-4">
													{tasaBcv > 0 ? (
														<div className="flex items-center">
															<span className="text-slate-400 bg-amber-50 border border-r-0 border-amber-200 rounded-l px-2 py-2 font-bold text-base text-amber-600">Bs</span>
															<input
																type="number"
																step="0.01"
																min="0"
																value={parseFloat(precioBs.toFixed(2))}
																onChange={(e) => handleBsPriceChange(i, e.target.value)}
																className="w-full border border-amber-200 rounded-r px-2 py-2 font-bold text-amber-700 text-right text-base outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
															/>
														</div>
													) : (
														<span className="text-base text-slate-400 italic">Sin tasa BCV</span>
													)}
												</td>
												{/* Variación USD únicamente */}
												<td className="px-4 py-4 text-center">
													{diff > 0 ? (
														<span className="bg-red-100 text-red-600 px-2 py-1 rounded-lg text-base font-bold flex items-center justify-center gap-1">
															<TrendingUp size={11} /> +${diff.toFixed(2)}
														</span>
													) : diff < 0 ? (
														<span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded-lg text-base font-bold flex items-center justify-center gap-1">
															<TrendingDown size={11} /> -${Math.abs(diff).toFixed(2)}
														</span>
													) : (
														<span className="text-slate-400 font-medium text-base">Sin cambios</span>
													)}
												</td>
												{/* Variación Bs únicamente */}
												<td className="px-4 py-4 text-center">
													{diff > 0 && tasaBcv > 0 ? (
														<span className="bg-red-100 text-red-600 px-2 py-1 rounded-lg text-base font-bold flex items-center justify-center gap-1">
															<TrendingUp size={11} /> +Bs {(diff * tasaBcv).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
														</span>
													) : diff < 0 && tasaBcv > 0 ? (
														<span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded-lg text-base font-bold flex items-center justify-center gap-1">
															<TrendingDown size={11} /> -Bs {(Math.abs(diff) * tasaBcv).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
														</span>
													) : (
														<span className="text-slate-400 font-medium text-base">Sin cambios</span>
													)}
												</td>
												{/* Subtotal */}
												<td className="px-4 py-4 text-right">
													<p className="font-black text-slate-800">${sumUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
													{tasaBcv > 0 && <p className="text-base text-amber-600 font-semibold">Bs {sumBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</p>}
												</td>
											</tr>
										)
									})}
								</tbody>
							</table>
						</div>
						
						{/* Info Banner */}
						<div className="bg-amber-50 border-t border-amber-100 p-4 flex gap-3 text-amber-800 text-base">
							<AlertCircle size={20} className="shrink-0" />
							<p>Verifique los precios y cantidades contra la Factura entregada por el proveedor. Si un precio se edita, se <strong>actualizará automáticamente</strong> el Catálogo de Costos permanente del sistema.</p>
						</div>
					</div>
					
				</div>

				{/* ─ FOOTER Modal ─ */}
				<div className="p-6 bg-white border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
					
					{/* Totales */}
					<div className="flex items-center gap-6">
						<div>
							<p className="text-base font-bold text-slate-400 uppercase tracking-widest mb-1">Subtotal</p>
							<p className="text-lg font-bold text-slate-600">${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
						</div>
						<div>
							<p className="text-base font-bold text-slate-400 uppercase tracking-widest mb-1">Total (+IVA)</p>
							<div className="flex items-center gap-2">
								<p className="text-2xl font-black text-[#006965]">${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
								{tasaBcv > 0 && <p className="text-base font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">Bs {(total * tasaBcv).toLocaleString("es-VE", { minimumFractionDigits: 2 })}</p>}
							</div>
						</div>
					</div>

					{orden.estado === "Recibida" ? (
						<button
							onClick={handlePrint}
							className="px-8 py-3.5 rounded-xl font-bold text-white shadow-md transition-all flex items-center gap-2 bg-slate-700 hover:bg-slate-900"
						>
							<Printer size={18} /> Imprimir Factura
						</button>
					) : (
						<button
							onClick={handleSubmit}
							disabled={isProcesando}
							className="px-8 py-3.5 rounded-xl font-bold text-white shadow-md transition-all flex items-center gap-2 bg-[#006965] hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isProcesando ? "Procesando..." : (
								<>
									<PackageCheck size={18} />
									Procesar Recepción
								</>
							)}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
