import { useState } from "react";
import { PackageOpen, Clock, FileText, CheckCircle2, XCircle, Printer, Package } from "lucide-react";
import { useGetOrdenesCompraQuery, useCancelarOrdenCompraMutation } from "../api/ordenesCompraApi";
import RecepcionCompraModal from "../components/RecepcionCompraModal";
import type { OrdenCompra } from "../api/ordenesCompraApi";
import { useGetDolarOficialQuery } from "../../dolar";
import Swal from "sweetalert2";

export default function RecepcionComprasPage() {
	const { data: ordenes = [], isLoading } = useGetOrdenesCompraQuery();
	const { data: dolarOficial } = useGetDolarOficialQuery();
	const [selectedOrden, setSelectedOrden] = useState<OrdenCompra | null>(null);

	// Filtros simples
	const [filtroEstado, setFiltroEstado] = useState<"Todos" | "Pendiente" | "Recibida" | "Cancelada">("Pendiente");
	const [cancelarOrden] = useCancelarOrdenCompraMutation();

	const handleCancelar = (id_orden: string, nro_orden: string) => {
		Swal.fire({
			title: '¿Cancelar esta Orden?',
			text: `Vas a cancelar la orden ${nro_orden}. Esta acción no se puede deshacer.`,
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#d33',
			cancelButtonColor: '#94a3b8',
			confirmButtonText: 'Sí, cancelar orden',
			cancelButtonText: 'No, mantener'
		}).then(async (result) => {
			if (result.isConfirmed) {
				try {
					await cancelarOrden(id_orden).unwrap();
					Swal.fire('Cancelada', 'La orden ha sido cancelada.', 'success');
				} catch (err: any) {
					Swal.fire('Error', err?.data?.message || 'Hubo un error al cancelar.', 'error');
				}
			}
		});
	};

	const filteredOrdenes = ordenes
		.filter((o: any) => (filtroEstado === "Todos" ? true : o.estado === filtroEstado))
		.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());

	const getEstadoBadge = (estado: string) => {
		switch (estado) {
			case "Pendiente":
				return <span className="bg-paper text-amber-700 font-bold px-2.5 py-1 rounded-md text-base border border-paper flex items-center gap-1 w-max"><Clock size={12} /> Stand By</span>;
			case "Recibida":
				return <span className="bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-md text-base border border-emerald-200 flex items-center gap-1 w-max"><CheckCircle2 size={12} /> Recibida</span>;
			case "Cancelada":
				return <span className="bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-md text-base border border-red-200 flex items-center gap-1 w-max"><XCircle size={12} /> Cancelada</span>;
			default:
				return <span>{estado}</span>;
		}
	};

	return (
		<div className="w-full p-4 md:p-6 flex flex-col gap-6">
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="h-12 w-12 rounded-xl bg-teal-50 text-[#006965] border border-teal-100 flex items-center justify-center">
						<PackageOpen size={24} />
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-slate-800">Recepción de Compras</h1>
						<p className="text-base font-medium text-slate-500">
							Procesa las Órdenes de Compra en Stand By para generar factura y registrar entrada.
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
					{["Pendiente", "Recibida", "Cancelada", "Todos"].map((opt) => (
						<button
							key={opt}
							onClick={() => setFiltroEstado(opt as any)}
							className={`px-4 py-2 text-base font-bold rounded-lg transition-all ${filtroEstado === opt ? 'bg-white text-teal-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
						>
							{opt}
						</button>
					))}
				</div>
			</div>

			{/* Tabla */}
			<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-base text-left">
						<thead className="bg-slate-50 text-base text-slate-500 font-bold uppercase border-b border-slate-100">
							<tr>
								<th className="px-5 py-4">N° Orden</th>
								<th className="px-5 py-4">Proveedor</th>
								<th className="px-5 py-4">Fecha Emisión</th>
								<th className="px-5 py-4">Estado</th>
								<th className="px-5 py-4 text-center">Productos</th>
								<th className="px-5 py-4 text-right">Total + IVA</th>
								<th className="px-5 py-4 text-center">Acciones</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{isLoading ? (
								<tr>
									<td colSpan={6} className="px-5 py-8 text-center text-slate-500">
										Cargando órdenes de compra...
									</td>
								</tr>
							) : filteredOrdenes.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-5 py-12 text-center text-slate-500 flex flex-col items-center">
										<FileText size={32} className="mb-2 opacity-50" />
										<span className="font-medium">No se encontraron órdenes de compra en estado {filtroEstado}.</span>
									</td>
								</tr>
							) : (
								filteredOrdenes.map((orden: OrdenCompra) => (
									<tr key={orden.id_orden} className="hover:bg-slate-50 transition-colors">
										<td className="px-5 py-4 font-bold text-slate-700">{orden.numero_orden}</td>
										<td className="px-5 py-4 font-medium text-slate-600">{orden.proveedor_nombre}</td>
										<td className="px-5 py-4 text-slate-500">{new Date(orden.fecha_emision).toLocaleDateString()}</td>
										<td className="px-5 py-4">{getEstadoBadge(orden.estado)}</td>
										{/* Columna Productos */}
										<td className="px-5 py-4 text-center">
											<div className="flex flex-col items-center gap-0.5">
												<span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-base font-bold">
													<Package size={11} />
													{orden.num_productos ?? 0} líneas
												</span>
												{(orden.total_unidades ?? 0) > 0 && (
													<span className="text-base text-slate-400">{Number(orden.total_unidades).toFixed(0)} und</span>
												)}
											</div>
										</td>
										{/* Columna Total + IVA */}
										<td className="px-5 py-4 text-right">
											<p className="font-bold text-slate-800">${Number(orden.total_con_iva ?? Number(orden.total_estimado) * 1.16).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
											<p className="text-base text-slate-400 font-medium">Bs {(Number(orden.total_con_iva ?? Number(orden.total_estimado) * 1.16) * (Number(dolarOficial?.promedio) || 1)).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
										</td>
										{/* Columna Acciones */}
										<td className="px-5 py-4">
											<div className="flex items-center justify-center gap-2">
												{orden.estado === "Pendiente" ? (
													<>
														<button
															onClick={() => setSelectedOrden(orden)}
															className="bg-[#006965] hover:bg-teal-800 text-white px-4 py-2 font-bold rounded-lg text-base transition-colors shadow-sm whitespace-nowrap"
														>
															Procesar
														</button>
														<button
															onClick={() => handleCancelar(orden.id_orden, orden.numero_orden)}
															className="text-slate-400 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg text-base font-bold transition-colors"
															title="Cancelar Orden"
														>
															<XCircle size={18} />
														</button>
													</>
												) : orden.estado === "Recibida" ? (
													<button
														onClick={() => setSelectedOrden(orden)}
														className="text-teal-600 hover:text-teal-800 hover:bg-teal-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 text-base font-bold"
														title="Ver / Imprimir Factura"
													>
														<Printer size={16} /> Factura
													</button>
												) : (
													<span className="text-slate-400 text-base font-medium">Cancelada</span>
												)}
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Modal de Procesamiento */}
			{selectedOrden && (
				<RecepcionCompraModal
					orden={selectedOrden}
					onClose={() => setSelectedOrden(null)}
				/>
			)}
		</div>
	);
}
