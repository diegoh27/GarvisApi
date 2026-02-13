import { useState } from "react";
import type { CitaPacienteCompleta } from "../citasApi";
import VerResultadosModal from "../../especialista/components/VerResultadosModal";
import PDFViewerModal from "../../especialista/components/PDFViewerModal";

type HistorialPacienteModalProps = {
	citas: CitaPacienteCompleta[];
	/** Cita desde la que se abrió "Ver historial"; se marcará como atendida al abrir si aplica */
	citaParaMarcarAtendida: CitaPacienteCompleta | null;
	formatFecha: (value: string | null) => string;
	formatHora: (value: string) => string;
	onClose: () => void;
};

const getEstadoCitaLabel = (estado: number) => {
	switch (estado) {
		case 0: return "Pendiente";
		case 1: return "Confirmada";
		case 2: return "Cancelada";
		case 3: return "Atendida";
		default: return "Desconocido";
	}
};

const parseResultadoArchivos = (value: string | null): string[] => {
	if (!value || value.trim() === "") return [];
	const trimmed = value.trim();
	if (trimmed.startsWith("[")) {
		try {
			const arr = JSON.parse(trimmed) as unknown;
			if (Array.isArray(arr)) return arr.filter((u): u is string => typeof u === "string" && u.trim() !== "");
		} catch {
			// ignore
		}
	}
	return trimmed ? [trimmed] : [];
};

const HistorialPacienteModal = ({
	citas,
	citaParaMarcarAtendida: _citaParaMarcarAtendida,
	formatFecha,
	formatHora,
	onClose,
}: HistorialPacienteModalProps) => {
	const [selectedCitaForResultados, setSelectedCitaForResultados] = useState<{
		archivos: string[];
		pacienteNombre: string;
		ecoNombre: string;
		idCita: string;
	} | null>(null);
	const [pdfViewer, setPdfViewer] = useState<{ url: string; title: string } | null>(null);

	return (
		<>
			<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8">
				<div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-paper shadow-xl">
					<div className="flex items-center justify-between border-b border-mist px-6 py-4">
						<div>
							<h3 className="text-base font-semibold text-brand-900">Historial de citas</h3>
							<p className="text-xs text-brand-800">Orden médica, resultados e informes.</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="rounded-full border border-mist px-3 py-1 text-xs text-brand-800 hover:bg-cloud"
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
										<th className="px-3 py-2 text-center">Orden médica</th>
										<th className="px-3 py-2 text-center">Resultado</th>
										<th className="px-3 py-2 text-center">Informe</th>
									</tr>
								</thead>
								<tbody>
									{citas.map((cita) => {
										const archivos = parseResultadoArchivos(cita.resultado_archivo);
										const fullName = `${cita.paciente_nombre ?? ""} ${cita.paciente_apellido ?? ""}`.trim();
										return (
											<tr key={cita.id_cita} className="border-b border-mist/70">
												<td className="px-3 py-3">{formatFecha(cita.fecha_cita)}</td>
												<td className="px-3 py-3">{formatHora(cita.hora_cita)}</td>
												<td className="px-3 py-3">{cita.eco_nombre}</td>
												<td className="px-3 py-3">
													<span className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800">
														{getEstadoCitaLabel(cita.estado_cita)}
													</span>
												</td>
												<td className="px-3 py-3 text-center">
													<button
														type="button"
														disabled={!cita.orden}
														onClick={() => {
															if (cita.orden) window.open(cita.orden, "_blank", "noopener,noreferrer");
														}}
														className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper disabled:opacity-50 hover:bg-brand-800"
													>
														Ver
													</button>
												</td>
												<td className="px-3 py-3 text-center">
													{archivos.length > 0 ? (
														<button
															type="button"
															onClick={() =>
																setSelectedCitaForResultados({
																	archivos,
																	pacienteNombre: fullName || "Paciente",
																	ecoNombre: cita.eco_nombre,
																	idCita: cita.id_cita,
																})
															}
															className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper hover:bg-brand-800"
														>
															{archivos.length === 1 ? "Ver resultado" : `Ver ${archivos.length} resultados`}
														</button>
													) : (
														<span className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800">
															Sin resultados
														</span>
													)}
												</td>
												<td className="px-3 py-3 text-center">
													{cita.informe_pdf_url ? (
														<button
															type="button"
															onClick={() => setPdfViewer({ url: cita.informe_pdf_url!, title: `Informe - ${cita.eco_nombre}` })}
															className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper hover:bg-brand-800"
														>
															Ver PDF
														</button>
													) : (
														<span className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800">
															Pendiente
														</span>
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						) : (
							<p className="text-sm text-brand-800">No hay citas en tu historial.</p>
						)}
					</div>
				</div>
			</div>

			{selectedCitaForResultados && (
				<VerResultadosModal
					archivos={selectedCitaForResultados.archivos}
					pacienteNombre={selectedCitaForResultados.pacienteNombre}
					ecoNombre={selectedCitaForResultados.ecoNombre}
					idCita={selectedCitaForResultados.idCita}
					onClose={() => setSelectedCitaForResultados(null)}
				/>
			)}

			{pdfViewer && (
				<PDFViewerModal
					pdfUrl={pdfViewer.url}
					fileName={pdfViewer.title}
					onClose={() => setPdfViewer(null)}
				/>
			)}
		</>
	);
};

export default HistorialPacienteModal;
