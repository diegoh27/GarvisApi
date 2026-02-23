import { useState } from "react";
import { X, FileText, FileCheck, Images } from "lucide-react";
import type { CitaEspecialista } from "../types";
import { useGetCitaByIdQuery } from "../especialistaApi";
import PDFViewerModal from "./PDFViewerModal";
import VerResultadosModal from "./VerResultadosModal";
import { formatFechaLocal } from "../../../shared";

const parseResultadoArchivos = (value: string | null | undefined): string[] => {
	if (!value || value.trim() === "") return [];
	try {
		const parsed = JSON.parse(value);
		const urls = Array.isArray(parsed) ? parsed : [value];
		return urls.filter((u): u is string => typeof u === "string" && u.trim() !== "");
	} catch {
		return value.trim() ? [value.trim()] : [];
	}
};

const isLikelyUrl = (value: string) =>
	/^https?:\/\//i.test(value) || value.startsWith("data:");

type VerCitaEspecialistaModalProps = {
	citaFromList: CitaEspecialista;
	informePdfUrl: string | null;
	pacienteName: string;
	onClose: () => void;
	onVerPdf?: (url: string, fileName: string) => void;
};

const formatFecha = (value: string | null) => (value ? formatFechaLocal(value) : "N/A");

const formatHora = (value: string) => {
	if (!value) return "";
	const [hourStr, minuteStr = "00"] = value.split(":");
	const hour = Number(hourStr);
	if (Number.isNaN(hour)) return value;
	const period = hour >= 12 ? "PM" : "AM";
	const hour12 = hour % 12 === 0 ? 12 : hour % 12;
	return `${hour12}:${minuteStr} ${period}`;
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

const getEstadoPagoLabel = (estado: number) => {
	switch (estado) {
		case 0: return "Pendiente";
		case 1: return "Aprobado";
		case 2: return "Negado";
		default: return "Desconocido";
	}
};

const VerCitaEspecialistaModal = ({
	citaFromList,
	informePdfUrl,
	pacienteName,
	onClose,
	onVerPdf,
}: VerCitaEspecialistaModalProps) => {
	const [showResultados, setShowResultados] = useState(false);
	const [pdfViewer, setPdfViewer] = useState<{ url: string; title: string } | null>(null);

	const { data: cita, isLoading, error } = useGetCitaByIdQuery(citaFromList.id_cita, {
		skip: !citaFromList.id_cita,
	});

	const archivos = parseResultadoArchivos(citaFromList.resultado_archivo);
	const studyUid = citaFromList.resultado_study_uid ?? null;
	const totalResultados = archivos.length + (studyUid ? 1 : 0);
	const estadoPago = cita?.estado_pago ?? citaFromList.estado_pago ?? 0;

	const openPdf = (url: string, title: string) => {
		if (onVerPdf) {
			onVerPdf(url, title);
		} else {
			setPdfViewer({ url, title });
		}
	};

	return (
		<>
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
				<div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-paper shadow-lg">
					<div className="sticky top-0 z-10 flex items-center justify-between border-b border-mist bg-paper p-4">
						<h2 className="text-lg font-semibold text-brand-900">Detalles de la cita</h2>
						<button
							onClick={onClose}
							className="rounded-lg p-1 text-brand-800 hover:bg-cloud"
							aria-label="Cerrar"
						>
							<X className="h-5 w-5" />
						</button>
					</div>

					<div className="p-6 space-y-6">
						{error ? (
							<p className="text-sm text-red-600">No se pudo cargar la información de la cita.</p>
						) : isLoading ? (
							<p className="text-sm text-brand-600">Cargando...</p>
						) : (
							<>
								<div>
									<h3 className="mb-3 text-sm font-semibold text-brand-900">Información de la cita</h3>
									<div className="grid gap-4 sm:grid-cols-2">
										<div>
											<p className="text-xs font-semibold text-brand-700">Fecha</p>
											<p className="mt-1 text-sm text-brand-900">
												{formatFecha(
													typeof citaFromList.fecha_cita === "string"
														? citaFromList.fecha_cita
														: citaFromList.fecha_cita instanceof Date
															? citaFromList.fecha_cita.toISOString().slice(0, 10)
															: ""
												)}
											</p>
										</div>
										<div>
											<p className="text-xs font-semibold text-brand-700">Hora</p>
											<p className="mt-1 text-sm text-brand-900">{formatHora(citaFromList.hora_cita)}</p>
										</div>
										<div>
											<p className="text-xs font-semibold text-brand-700">Estado de la cita</p>
											<span
												className={`inline-flex rounded-full px-2 py-1 text-xs ${citaFromList.estado_cita === 0
														? "bg-amber-400 text-brand-900"
														: citaFromList.estado_cita === 1
															? "bg-brand-700 text-paper"
															: citaFromList.estado_cita === 2
																? "bg-red-500 text-paper"
																: "bg-sky-500 text-paper"
													}`}
											>
												{getEstadoCitaLabel(citaFromList.estado_cita)}
											</span>
										</div>
										<div>
											<p className="text-xs font-semibold text-brand-700">Estado del pago</p>
											<span
												className={`inline-flex rounded-full px-2 py-1 text-xs ${estadoPago === 0
														? "bg-amber-400 text-brand-900"
														: estadoPago === 1
															? "bg-emerald-600 text-paper"
															: "bg-red-500 text-paper"
													}`}
											>
												{getEstadoPagoLabel(estadoPago)}
											</span>
										</div>
										<div className="sm:col-span-2">
											<p className="text-xs font-semibold text-brand-700">Paciente</p>
											<p className="mt-1 text-sm text-brand-900">{pacienteName}</p>
										</div>
										<div className="sm:col-span-2">
											<p className="text-xs font-semibold text-brand-700">Especialista</p>
											<p className="mt-1 text-sm text-brand-900">
												{cita?.especialista_nombre} {cita?.especialista_apellido}
											</p>
										</div>
										<div>
											<p className="text-xs font-semibold text-brand-700">Estudio / Eco</p>
											<p className="mt-1 text-sm text-brand-900">{citaFromList.eco_nombre}</p>
										</div>
										<div className="sm:col-span-2">
											<p className="text-xs font-semibold text-brand-700">Representado</p>
											{cita?.id_representado &&
												(cita.representado_nombre ?? cita.representado_apellido) ? (
												<div className="mt-1 rounded-lg border border-brand-200 bg-brand-50/50 p-3 text-sm text-brand-900 space-y-1">
													<p>
														<strong>Nombre:</strong>{" "}
														{[cita.representado_nombre, cita.representado_apellido]
															.filter(Boolean)
															.join(" ") || "—"}
													</p>
													{cita.representado_cedula && (
														<p>
															<strong>Cédula:</strong> {cita.representado_cedula}
														</p>
													)}
													{cita.representado_fecha_nacimiento && (
														<p>
															<strong>Fecha de nacimiento:</strong>{" "}
															{formatFecha(cita.representado_fecha_nacimiento)}
														</p>
													)}
													{cita.representado_parentesco && (
														<p>
															<strong>Parentesco:</strong> {cita.representado_parentesco}
														</p>
													)}
												</div>
											) : (
												<p className="mt-1 text-sm text-brand-600">Representado: NO</p>
											)}
										</div>
									</div>
								</div>

								<div>
									<h3 className="mb-3 text-sm font-semibold text-brand-900">Documentos</h3>
									<div className="flex flex-wrap gap-3">
										{citaFromList.orden && citaFromList.orden.trim() !== "" ? (
											<button
												type="button"
												onClick={() => {
													const url = isLikelyUrl(citaFromList.orden!)
														? citaFromList.orden!
														: citaFromList.orden!.startsWith("http")
															? citaFromList.orden!
															: `https://${citaFromList.orden!}`;
													window.open(url, "_blank", "noopener,noreferrer");
												}}
												className="inline-flex items-center gap-2 rounded-lg border border-brand-600 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-100"
											>
												<FileCheck className="h-4 w-4" />
												Ver orden médica
											</button>
										) : (
											<span className="inline-flex items-center gap-2 rounded-lg border border-mist bg-cloud px-4 py-2 text-sm text-brand-600">
												<FileCheck className="h-4 w-4" />
												Orden médica no disponible
											</span>
										)}
										{informePdfUrl ? (
											<button
												type="button"
												onClick={() =>
													openPdf(
														informePdfUrl,
														`Informe-${pacienteName}-${citaFromList.fecha_cita}.pdf`.replace(/\s+/g, "-")
													)
												}
												className="inline-flex items-center gap-2 rounded-lg border border-brand-600 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-100"
											>
												<FileText className="h-4 w-4" />
												Ver informe médico
											</button>
										) : (
											<span className="inline-flex items-center gap-2 rounded-lg border border-mist bg-cloud px-4 py-2 text-sm text-brand-600">
												<FileText className="h-4 w-4" />
												Informe no disponible
											</span>
										)}
									{totalResultados > 0 ? (
										<button
											type="button"
											onClick={() => setShowResultados(true)}
											className="inline-flex items-center gap-2 rounded-lg border border-brand-600 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-100"
										>
											<Images className="h-4 w-4" />
											{totalResultados === 1 ? "Ver resultado" : `Ver ${totalResultados} resultados`}
										</button>
									) : (
										<span className="inline-flex items-center gap-2 rounded-lg border border-mist bg-cloud px-4 py-2 text-sm text-brand-600">
											<Images className="h-4 w-4" />
											Resultados no disponibles
										</span>
									)}
									</div>
								</div>
							</>
						)}
					</div>

					<div className="sticky bottom-0 border-t border-mist bg-paper p-4 flex justify-end">
						<button
							onClick={onClose}
							className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper hover:bg-brand-800"
						>
							Cerrar
						</button>
					</div>
				</div>
			</div>

			{pdfViewer && (
				<PDFViewerModal
					pdfUrl={pdfViewer.url}
					onClose={() => setPdfViewer(null)}
					fileName={pdfViewer.title}
				/>
			)}

		{showResultados && totalResultados > 0 && (
			<VerResultadosModal
				archivos={archivos}
				studyUid={studyUid}
				pacienteNombre={pacienteName}
				ecoNombre={citaFromList.eco_nombre ?? ""}
				idCita={citaFromList.id_cita}
				onClose={() => setShowResultados(false)}
			/>
		)}
		</>
	);
};

export default VerCitaEspecialistaModal;
