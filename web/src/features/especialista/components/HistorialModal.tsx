import { useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import type { CitaEspecialista } from "../types";
import { useMarcarAtendidaMutation } from "../especialistaApi";
import { useUploadResultadoMutation } from "../../resultados/resultadosApi";
import { Check, X } from "lucide-react";
import VerResultadosModal from "./VerResultadosModal";
import InformeFormModal from "./InformeFormModal";
import VerCitaEspecialistaModal from "./VerCitaEspecialistaModal";
import SubirResultadoModal from "./SubirResultadoModal";

type InformeItem = { informe_pdf_url: string | null };

type HistorialModalProps = {
	paciente: { id: string; name: string };
	citas: CitaEspecialista[];
	/** Cita desde la que se abrió "Ver historial"; se marcará como atendida al abrir si aplica */
	citaParaMarcarAtendida?: CitaEspecialista | null;
	/** Mapa id_cita -> informe para mostrar Ver PDF / Llenar / Pendiente */
	informesMap?: Map<string, InformeItem>;
	formatFecha: (value: string) => string;
	formatHora: (value: string) => string;
	getEstadoLabel: (cita: CitaEspecialista) => string;
	getResultadoLabel: (cita: CitaEspecialista) => string;
	onVerPdf?: (url: string, fileName: string) => void;
	onDownload?: (contenido: string, label: string) => void;
	onClose: () => void;
};

const getDateKey = (value: string | Date): string => {
	if (!value) return "";
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	return String(value).includes("T") ? String(value).split("T")[0] : String(value);
};

// Función para parsear el archivo (puede ser string simple o JSON array)
const parseResultadoArchivo = (archivo: string | null | undefined): string[] => {
	if (!archivo) return [];
	try {
		const parsed = JSON.parse(archivo);
		const urls = Array.isArray(parsed) ? parsed : [archivo];
		// Validar y corregir URLs que no tengan protocolo
		return urls.map((url) => {
			if (!url) return url;
			const trimmedUrl = url.trim();
			if (!trimmedUrl.match(/^https?:\/\//i)) {
				return `https://${trimmedUrl}`;
			}
			return trimmedUrl;
		});
	} catch {
		// Si no es JSON, tratar como string simple
		const trimmedUrl = archivo.trim();
		if (!trimmedUrl.match(/^https?:\/\//i)) {
			return [`https://${trimmedUrl}`];
		}
		return [trimmedUrl];
	}
};

const HistorialModal = ({
	paciente,
	citas,
	citaParaMarcarAtendida: _citaParaMarcarAtendida = null,
	informesMap = new Map(),
	formatFecha,
	formatHora,
	getEstadoLabel,
	getResultadoLabel,
	onVerPdf,
	onDownload,
	onClose,
}: HistorialModalProps) => {
	const [selectedCitaForResultados, setSelectedCitaForResultados] = useState<{
		archivos: string[];
		studyUid: string | null;
		pacienteNombre: string;
		ecoNombre: string;
		idCita: string;
	} | null>(null);
	const [selectedCitaParaInforme, setSelectedCitaParaInforme] = useState<CitaEspecialista | null>(null);
	const [selectedCitaParaSubirResultado, setSelectedCitaParaSubirResultado] = useState<CitaEspecialista | null>(null);
	const [selectedCitaParaVer, setSelectedCitaParaVer] = useState<{
		cita: CitaEspecialista;
		informePdfUrl: string | null;
	} | null>(null);

	const [marcarAtendida] = useMarcarAtendidaMutation();
	const [uploadResultado, { isLoading: isUploading }] = useUploadResultadoMutation();

	const handleSubirResultado = async (id_cita: string, archivos: File[]) => {
		try {
			const cita = citas.find((c) => c.id_cita === id_cita);
			const nombre = cita
				? `${cita.paciente_nombre}_${cita.paciente_apellido}_${cita.eco_nombre}_${cita.fecha_cita}`
				: undefined;
			await uploadResultado({ id_cita, archivos, nombre }).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Resultados subidos",
				text: `Se subieron ${archivos.length} archivo${archivos.length > 1 ? "s" : ""} exitosamente.`,
				timer: 2000,
				showConfirmButton: false,
			});
			setSelectedCitaParaSubirResultado(null);
		} catch (error: unknown) {
			const msg = error && typeof error === "object" && "data" in error && typeof (error as { data?: { message?: string } }).data?.message === "string"
				? (error as { data: { message: string } }).data.message
				: "No se pudieron subir los resultados.";
			await Swal.fire({
				icon: "error",
				title: "Error",
				text: msg,
			});
		}
	};

	const handleMarcarAtendida = async (cita: CitaEspecialista) => {
		if (cita.estado_pago === 0) {
			await Swal.fire({
				title: "Pago pendiente",
				text: "No puedes marcar esta cita hasta que el pago sea aprobado.",
				icon: "info",
				confirmButtonText: "Entendido",
				confirmButtonColor: "#1C837F",
			});
			return;
		}
		if (cita.estado_cita === 3) {
			await Swal.fire({
				title: "Cita ya atendida",
				icon: "info",
				confirmButtonText: "Listo",
				confirmButtonColor: "#1C837F",
			});
			return;
		}
		if (cita.estado_cita === 2) {
			await Swal.fire({
				title: "Cita cancelada",
				text: "No puedes marcar como atendida una cita cancelada.",
				icon: "info",
				confirmButtonText: "Entendido",
				confirmButtonColor: "#1C837F",
			});
			return;
		}
		const today = new Date().toISOString().slice(0, 10);
		const citaDateKey = getDateKey(cita.fecha_cita);
		if (citaDateKey > today) {
			await Swal.fire({
				title: "Aún no puedes marcar esta cita",
				text: "Solo puedes marcar como atendida cuando llegue el día.",
				icon: "info",
				confirmButtonText: "Entendido",
				confirmButtonColor: "#1C837F",
			});
			return;
		}
		const confirmResult = await Swal.fire({
			title: "¿Marcar cita como atendida?",
			text: "Esta acción confirma que el paciente fue atendido.",
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Sí, atender",
			cancelButtonText: "No",
			confirmButtonColor: "#1C837F",
			cancelButtonColor: "#9FD8E1",
		});
		if (!confirmResult.isConfirmed) return;
		try {
			await marcarAtendida(cita.id_cita).unwrap();
		} catch (err) {
			await Swal.fire({
				title: "No se pudo marcar",
				text: (err as Error).message ?? "No se pudo marcar como atendida la cita.",
				icon: "error",
				confirmButtonText: "Entendido",
				confirmButtonColor: "#1C837F",
			});
		}
	};

	return (
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
									<th className="px-3 py-2 text-center">Representado</th>
									<th className="px-3 py-2 text-center">Estado</th>
									<th className="px-3 py-2 text-center">Resultado</th>
									<th className="px-3 py-2 text-center">Orden Médica</th>
									<th className="px-3 py-2 text-center">Informe</th>
									<th className="px-3 py-2 text-center">Ver cita</th>
								</tr>
							</thead>
							<tbody>
								{citas.map((cita) => (
									<tr key={cita.id_cita} className="border-b border-mist/70">
										<td className="px-3 py-3">
											{formatFecha(
												cita.fecha_cita instanceof Date
													? cita.fecha_cita.toISOString()
													: cita.fecha_cita
											)}
										</td>
										<td className="px-3 py-3">{formatHora(cita.hora_cita)}</td>
										<td className="px-3 py-3">{cita.eco_nombre}</td>
										<td className="px-3 py-3 text-center">
											{cita.id_representado ? (
												<span className="inline-flex items-center justify-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-800" title="Representado">
													<Check className="h-3.5 w-3.5" />
												</span>
											) : (
												<span className="inline-flex items-center justify-center gap-0.5 rounded-full bg-cloud px-2 py-0.5 text-[11px] text-brand-700" title="No representado">
													<X className="h-3.5 w-3.5" />
												</span>
											)}
										</td>
										<td className="px-3 py-3 text-center">
											<div className="flex flex-col items-center gap-1">
												<span className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800">
													{getEstadoLabel(cita)}
												</span>
												{cita.estado_cita === 1 &&
													cita.estado_pago === 1 &&
													getDateKey(cita.fecha_cita) <= new Date().toISOString().slice(0, 10) && (
														<button
															type="button"
															onClick={() => handleMarcarAtendida(cita)}
															className="rounded-full border border-mint px-2 py-0.5 text-[10px] text-brand-800 hover:bg-cloud"
														>
															Marcar atendida
														</button>
													)}
											</div>
										</td>
										<td className="px-3 py-3 text-center">
										{(() => {
											const archivos = parseResultadoArchivo(cita.resultado_archivo);
											const tieneDicom = !!cita.resultado_study_uid;
											const total = archivos.length + (tieneDicom ? 1 : 0);
											if (total > 0) {
												return (
													<button
														type="button"
														onClick={() => {
															setSelectedCitaForResultados({
																archivos,
																studyUid: cita.resultado_study_uid ?? null,
																pacienteNombre: paciente.name,
																ecoNombre: cita.eco_nombre,
																idCita: cita.id_cita,
															});
														}}
														className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper hover:bg-brand-800"
													>
														{total === 1 ? "Ver resultado" : `Ver ${total} resultados`}
													</button>
												);
											}
											return (
												<span className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800">
													{getResultadoLabel(cita)}
												</span>
											);
										})()}
										</td>
										<td className="px-3 py-3 text-center">
											<button
												type="button"
												disabled={!cita.orden}
												onClick={() => {
													if (cita.orden) {
														window.open(cita.orden, "_blank", "noopener,noreferrer");
													}
												}}
												className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper disabled:opacity-50"
											>
												Ver
											</button>
										</td>
										<td className="px-3 py-3 text-center">
											{(() => {
												const informe = informesMap.get(cita.id_cita);
												const isAtendida = cita.estado_cita === 3;
												const botonSubirResultado = isAtendida ? (
													<button
														type="button"
														onClick={() => setSelectedCitaParaSubirResultado(cita)}
														className="rounded-full border border-brand-700 bg-brand-700 px-3 py-1 text-[11px] text-paper hover:bg-brand-800"
													>
														Subir resultado
													</button>
												) : null;
												if (informe?.informe_pdf_url) {
													return (
														<div className="flex flex-wrap items-center justify-center gap-1">
															<button
																type="button"
																onClick={() =>
																	onVerPdf?.(
																		informe.informe_pdf_url!,
																		`Informe-${paciente.name}-${cita.fecha_cita}.pdf`.replace(/\s+/g, "-")
																	)
																}
																className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper hover:bg-brand-800"
															>
																Ver PDF
															</button>
															{botonSubirResultado}
														</div>
													);
												}
												if (isAtendida) {
													return (
														<div className="flex flex-wrap items-center justify-center gap-1">
															<button
																type="button"
																onClick={() => setSelectedCitaParaInforme(cita)}
																className="rounded-full border border-brand-700 bg-brand-700 px-3 py-1 text-[11px] text-paper hover:bg-brand-800"
															>
																Llenar
															</button>
															{botonSubirResultado}
														</div>
													);
												}
												return (
													<span className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800">
														Pendiente
													</span>
												);
											})()}
										</td>
										<td className="px-3 py-3 text-center">
											<button
												type="button"
												onClick={() =>
													setSelectedCitaParaVer({
														cita,
														informePdfUrl: informesMap.get(cita.id_cita)?.informe_pdf_url ?? null,
													})
												}
												className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper hover:bg-brand-800"
											>
												Ver cita
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
		{selectedCitaForResultados && (
			<VerResultadosModal
				archivos={selectedCitaForResultados.archivos}
				studyUid={selectedCitaForResultados.studyUid}
				pacienteNombre={selectedCitaForResultados.pacienteNombre}
				ecoNombre={selectedCitaForResultados.ecoNombre}
				idCita={selectedCitaForResultados.idCita}
				onClose={() => setSelectedCitaForResultados(null)}
			/>
		)}

			{selectedCitaParaInforme && (
				<InformeFormModal
					cita={selectedCitaParaInforme}
					onClose={() => setSelectedCitaParaInforme(null)}
					onSuccess={() => setSelectedCitaParaInforme(null)}
				/>
			)}

			{selectedCitaParaVer && (
				<VerCitaEspecialistaModal
					citaFromList={selectedCitaParaVer.cita}
					informePdfUrl={selectedCitaParaVer.informePdfUrl}
					pacienteName={paciente.name}
					onClose={() => setSelectedCitaParaVer(null)}
					onVerPdf={onVerPdf}
				/>
			)}

			{selectedCitaParaSubirResultado && (
				<SubirResultadoModal
					cita={{
						id_cita: selectedCitaParaSubirResultado.id_cita,
						paciente_nombre: selectedCitaParaSubirResultado.paciente_nombre,
						paciente_apellido: selectedCitaParaSubirResultado.paciente_apellido,
						eco_nombre: selectedCitaParaSubirResultado.eco_nombre,
						fecha_cita:
							typeof selectedCitaParaSubirResultado.fecha_cita === "string"
								? selectedCitaParaSubirResultado.fecha_cita
								: selectedCitaParaSubirResultado.fecha_cita instanceof Date
									? selectedCitaParaSubirResultado.fecha_cita.toISOString().slice(0, 10)
									: String(selectedCitaParaSubirResultado.fecha_cita),
					}}
					onClose={() => setSelectedCitaParaSubirResultado(null)}
					onUpload={handleSubirResultado}
					isUploading={isUploading}
				/>
			)}
		</div>
	);
};

export default HistorialModal;
