import type { CitaEspecialista } from "../types";

type HistorialModalProps = {
	paciente: { id: string; name: string };
	citas: CitaEspecialista[];
	formatFecha: (value: string) => string;
	formatHora: (value: string) => string;
	getEstadoLabel: (cita: CitaEspecialista) => string;
	getResultadoLabel: (cita: CitaEspecialista) => string;
	onDownload: (contenido: string, label: string) => void;
	onClose: () => void;
};

const HistorialModal = ({
	paciente,
	citas,
	formatFecha,
	formatHora,
	getEstadoLabel,
	getResultadoLabel,
	onDownload,
	onClose,
}: HistorialModalProps) => (
	<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8">
		<div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-paper shadow-xl">
			<div className="flex items-center justify-between border-b border-mist px-6 py-4">
				<div>
					<h3 className="text-base font-semibold text-brand-900">
						Historial de {paciente.name}
					</h3>
					<p className="text-xs text-brand-800">
						Registro completo de citas y resultados.
					</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="rounded-full border border-mist px-3 py-1 text-xs text-brand-800"
				>
					Cerrar
				</button>
			</div>
			<div className="max-h-[60vh] overflow-y-auto p-6">
				{citas.length ? (
					<table className="w-full text-left text-xs text-brand-800">
						<thead>
							<tr className="border-b border-mist text-[11px] uppercase text-brand-700">
								<th className="px-3 py-2">Fecha</th>
								<th className="px-3 py-2">Hora</th>
								<th className="px-3 py-2">Eco</th>
								<th className="px-3 py-2">Estado</th>
								<th className="px-3 py-2">Resultado</th>
								<th className="px-3 py-2 text-center">Orden</th>
							</tr>
						</thead>
						<tbody>
							{citas.map((cita) => (
								<tr key={cita.id_cita} className="border-b border-mist/70">
									<td className="px-3 py-3">{formatFecha(cita.fecha_cita)}</td>
									<td className="px-3 py-3">{formatHora(cita.hora_cita)}</td>
									<td className="px-3 py-3">{cita.eco_nombre}</td>
									<td className="px-3 py-3">
										<span className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800">
											{getEstadoLabel(cita)}
										</span>
									</td>
									<td className="px-3 py-3">
										{cita.resultado_archivo ? (
											<button
												type="button"
												onClick={() =>
													onDownload(
														cita.resultado_archivo!,
														`${paciente.name}-${cita.fecha_cita}-resultado`,
													)
												}
												className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper"
											>
												Descargar
											</button>
										) : (
											<span className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800">
												{getResultadoLabel(cita)}
											</span>
										)}
									</td>
									<td className="px-3 py-3 text-center">
										<button
											type="button"
											disabled={!cita.orden}
											onClick={() =>
												cita.orden
													? onDownload(
															cita.orden,
															`${paciente.name}-${cita.fecha_cita}-orden`,
														)
													: null
											}
											className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper disabled:opacity-50"
										>
											Descargar
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				) : (
					<p className="text-sm text-brand-800">
						No hay historial para este paciente.
					</p>
				)}
			</div>
		</div>
	</div>
);

export default HistorialModal;
