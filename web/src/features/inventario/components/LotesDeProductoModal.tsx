import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { useListLotesByProductoQuery } from "../../productos/productosApi";
import type { ProductoLote } from "../../productos/productosApi";
import EditarLoteModal from "./EditarLoteModal";

type LotesDeProductoModalProps = {
	id_producto: string;
	nombre: string;
	onClose: () => void;
};

const formatDate = (value: string | null): string => {
	if (!value) return "—";
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const LotesDeProductoModal = ({ id_producto, nombre, onClose }: LotesDeProductoModalProps) => {
	const [loteParaEditar, setLoteParaEditar] = useState<ProductoLote | null>(null);

	const { data: lotes = [], isLoading } = useListLotesByProductoQuery(id_producto);

	return (
		<>
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
				<div className="relative w-full max-w-2xl rounded-xl bg-paper shadow-lg">
					<div className="flex items-center justify-between border-b border-mist p-4">
						<h2 className="text-lg font-semibold text-brand-900">Lotes de {nombre}</h2>
						<button
							onClick={onClose}
							className="rounded-lg p-1 text-brand-800 hover:bg-cloud"
							aria-label="Cerrar"
						>
							<X className="h-5 w-5" />
						</button>
					</div>

					<div className="max-h-[70vh] overflow-auto p-4">
						{isLoading ? (
							<p className="text-center text-brand-600">Cargando lotes...</p>
						) : lotes.length === 0 ? (
							<p className="text-center text-brand-600">No hay lotes registrados para este producto.</p>
						) : (
							<table className="w-full text-left text-sm">
								<thead>
									<tr className="border-b border-brand-200 bg-brand-100/50">
										<th className="px-3 py-2 font-semibold text-brand-900">Cantidad</th>
										<th className="px-3 py-2 font-semibold text-brand-900">Fecha ingreso</th>
										<th className="px-3 py-2 font-semibold text-brand-900">Fecha venc.</th>
										<th className="px-3 py-2 font-semibold text-brand-900">Costo total</th>
										<th className="px-3 py-2 font-semibold text-brand-900">Editar</th>
									</tr>
								</thead>
								<tbody>
									{lotes.map((lote) => (
										<tr key={lote.id_lote} className="border-b border-brand-100">
											<td className="px-3 py-2 text-brand-800">{lote.cantidad}</td>
											<td className="px-3 py-2 text-brand-800">{formatDate(lote.fecha_ingreso)}</td>
											<td className="px-3 py-2 text-brand-800">{formatDate(lote.fecha_vencimiento)}</td>
											<td className="px-3 py-2 text-brand-800">
												{lote.costo_total != null ? `${Number(lote.costo_total).toFixed(2)} $` : "—"}
											</td>
											<td className="px-3 py-2">
												<button
													type="button"
													onClick={() => setLoteParaEditar(lote)}
													className="rounded p-1.5 text-brand-600 hover:bg-brand-100 hover:text-brand-800"
													title="Editar lote"
												>
													<Pencil className="h-4 w-4" />
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>

					<div className="border-t border-mist px-4 py-3 text-xs text-brand-600">
						Corrige cantidad, fechas o costo desde aquí. Al guardar se actualiza el stock y el gasto.
					</div>
				</div>
			</div>

			{loteParaEditar && (
				<EditarLoteModal
					productoNombre={nombre}
					lote={loteParaEditar}
					onClose={() => setLoteParaEditar(null)}
					onSuccess={() => setLoteParaEditar(null)}
				/>
			)}
		</>
	);
};

export default LotesDeProductoModal;
