import { useState } from "react";
import { X, FileText, Banknote, FileCheck, Images, AlertCircle, Edit } from "lucide-react";
import type { CitaPacienteCompleta } from "../citasApi";
import PDFViewerModal from "../../especialista/components/PDFViewerModal";
import VerPagoModal from "../../moderadores/components/VerPagoModal";
import VerResultadosModal from "../../especialista/components/VerResultadosModal";
import { useGetPagoByCitaQuery } from "../../moderadores/moderadoresApi";
import { useUpdatePagoMutation } from "../../pagos/pagosApi";
import FormularioPago, { type PagoFormData } from "../../../shared/components/FormularioPago";
import Swal from "sweetalert2";

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

const isLikelyUrl = (value: string) => /^https?:\/\//i.test(value) || value.startsWith("data:");

type VerCitaPacienteModalProps = {
	cita: CitaPacienteCompleta | null;
	onClose: () => void;
};

const formatFecha = (value: string | null) => {
	if (!value) return "N/A";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString("es-VE", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
};

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
		case 0:
			return "Pendiente";
		case 1:
			return "Confirmada";
		case 2:
			return "Cancelada";
		case 3:
			return "Atendida";
		default:
			return "Desconocido";
	}
};

const getEstadoPagoLabel = (estado: number) => {
	switch (estado) {
		case 0:
			return "Pendiente";
		case 1:
			return "Aprobado";
		case 2:
			return "Negado";
		default:
			return "Desconocido";
	}
};

const VerCitaPacienteModal = ({ cita, onClose }: VerCitaPacienteModalProps) => {
	const [pdfViewer, setPdfViewer] = useState<{ url: string; title: string } | null>(null);
	const [showVerPago, setShowVerPago] = useState(false);
	const [showResultados, setShowResultados] = useState(false);
	const [isEditingPago, setIsEditingPago] = useState(false);
	const [pagoFormData, setPagoFormData] = useState<Partial<PagoFormData>>({});

	const { data: pago, error: pagoError, isLoading: pagoLoading } = useGetPagoByCitaQuery(cita?.id_cita ?? "", {
		skip: !showVerPago || !cita?.id_cita,
	});

	const [updatePago, { isLoading: isUpdatingPago }] = useUpdatePagoMutation();

	const openPdf = (url: string, title: string) => {
		setPdfViewer({ url, title });
	};

	const handleCorregirPago = () => {
		setIsEditingPago(true);
	};

	const handleCancelarEdicion = () => {
		setIsEditingPago(false);
		setPagoFormData({});
	};

	const handleSubmitCorreccion = async () => {
		if (!cita?.id_cita) return;

		try {
			await updatePago({
				id_cita: cita.id_cita,
				...pagoFormData,
			}).unwrap();

			await Swal.fire({
				icon: "success",
				title: "Pago corregido",
				text: "Tu pago ha sido actualizado y será revisado nuevamente.",
				timer: 2500,
				showConfirmButton: false,
			});

			setIsEditingPago(false);
			setPagoFormData({});
			onClose();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo actualizar el pago",
			});
		}
	};

	if (!cita) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
				<div className="rounded-2xl bg-paper p-6 shadow-lg">
					<p className="text-brand-800">Cargando...</p>
				</div>
			</div>
		);
	}

	const estadoPago = cita.estado_pago ?? cita.pago_estado_pago ?? 0;

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
						{/* Info básica */}
						<div>
							<h3 className="mb-3 text-sm font-semibold text-brand-900">Información de la cita</h3>
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<p className="text-xs font-semibold text-brand-700">Fecha</p>
									<p className="mt-1 text-sm text-brand-900">{formatFecha(cita.fecha_cita)}</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-brand-700">Hora</p>
									<p className="mt-1 text-sm text-brand-900">{formatHora(cita.hora_cita)}</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-brand-700">Estado de la cita</p>
									<span
										className={`inline-flex rounded-full px-2 py-1 text-xs ${cita.estado_cita === 0
											? "bg-amber-400 text-brand-900"
											: cita.estado_cita === 1
												? "bg-brand-700 text-paper"
												: cita.estado_cita === 2
													? "bg-red-500 text-paper"
													: "bg-sky-500 text-paper"
											}`}
									>
										{getEstadoCitaLabel(cita.estado_cita)}
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
									<p className="text-xs font-semibold text-brand-700">Especialista</p>
									<p className="mt-1 text-sm text-brand-900">
										{cita.especialista_nombre} {cita.especialista_apellido}
									</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-brand-700">Estudio / Eco</p>
									<p className="mt-1 text-sm text-brand-900">{cita.eco_nombre}</p>
								</div>
								<div className="sm:col-span-2">
									<p className="text-xs font-semibold text-brand-700">Representado</p>
									{cita.id_representado &&
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
											{cita.representado_genero && (
												<p>
													<strong>Género:</strong> {cita.representado_genero}
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

						{/* Alerta de pago rechazado + botón corregir */}
						{estadoPago === 2 && !isEditingPago && (
							<div className="rounded-lg border border-red-200 bg-red-50 p-4">
								<div className="flex items-start gap-3">
									<AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
									<div className="flex-1">
										<h4 className="text-sm font-semibold text-red-900 mb-1">
											Pago rechazado
										</h4>
										<p className="text-xs text-red-700 mb-3">
											Tu comprobante de pago fue rechazado. Por favor, corrige la información y vuelve a enviarlo.
										</p>
										<button
											type="button"
											onClick={handleCorregirPago}
											className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
										>
											<Edit className="h-4 w-4" />
											Corregir pago
										</button>
									</div>
								</div>
							</div>
						)}

						{/* Formulario de corrección de pago */}
						{isEditingPago && (
							<div className="rounded-lg border border-brand-200 bg-brand-50/50 p-4">
								<h4 className="text-sm font-semibold text-brand-900 mb-3">
									Corregir comprobante de pago
								</h4>
								<FormularioPago
									precioEcoUSD={cita?.eco_precio ? parseFloat(cita.eco_precio.toString()) : null}
									onChange={setPagoFormData}
									initialData={pagoFormData}
									isLoading={isUpdatingPago}
									disabled={isUpdatingPago}
								/>
								<div className="flex items-center justify-end gap-3 mt-4">
									<button
										type="button"
										onClick={handleCancelarEdicion}
										disabled={isUpdatingPago}
										className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
									>
										Cancelar
									</button>
									<button
										type="button"
										onClick={handleSubmitCorreccion}
										disabled={isUpdatingPago || !pagoFormData.imagen}
										className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
									>
										{isUpdatingPago ? "Actualizando..." : "Guardar corrección"}
									</button>
								</div>
							</div>
						)}

						{/* Documentos: pago, orden médica, informe médico y resultados (igual que admin/moderador) */}
						<div>
							<h3 className="mb-3 text-sm font-semibold text-brand-900">Documentos</h3>
							<div className="flex flex-wrap gap-3">
								{cita.id_pago ? (
									<button
										type="button"
										onClick={() => setShowVerPago(true)}
										className="inline-flex items-center gap-2 rounded-lg border border-brand-600 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-100"
									>
										<Banknote className="h-4 w-4" />
										Ver pago
									</button>
								) : (
									<span className="inline-flex items-center gap-2 rounded-lg border border-mist bg-cloud px-4 py-2 text-sm text-brand-600">
										<Banknote className="h-4 w-4" />
										Pago no disponible
									</span>
								)}
								{cita.orden && cita.orden.trim() !== "" ? (
									<button
										type="button"
										onClick={() => {
											const url = isLikelyUrl(cita.orden!) ? cita.orden! : cita.orden!.startsWith("http") ? cita.orden! : `https://${cita.orden!}`;
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
								{cita.informe_pdf_url ? (
									<button
										type="button"
										onClick={() => openPdf(cita.informe_pdf_url!, "Informe médico")}
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
								{(() => {
									const archivos = parseResultadoArchivos(cita.resultado_archivo);
									return archivos.length > 0 ? (
										<button
											type="button"
											onClick={() => setShowResultados(true)}
											className="inline-flex items-center gap-2 rounded-lg border border-brand-600 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-100"
										>
											<Images className="h-4 w-4" />
											{archivos.length === 1 ? "Ver resultado" : `Ver ${archivos.length} resultados`}
										</button>
									) : (
										<span className="inline-flex items-center gap-2 rounded-lg border border-mist bg-cloud px-4 py-2 text-sm text-brand-600">
											<Images className="h-4 w-4" />
											Resultados no disponibles
										</span>
									);
								})()}
							</div>
						</div>
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

			{showVerPago && (
				<VerPagoModal
					pago={pagoLoading ? null : pago ?? null}
					error={!pagoLoading && pagoError ? "No se pudo cargar la información del pago." : null}
					onClose={() => setShowVerPago(false)}
				/>
			)}

			{showResultados && cita && (() => {
				const archivos = parseResultadoArchivos(cita.resultado_archivo);
				if (archivos.length === 0) return null;
				const pacienteNombre = `${cita.paciente_nombre ?? ""} ${cita.paciente_apellido ?? ""}`.trim() || "Paciente";
				return (
					<VerResultadosModal
						archivos={archivos}
						pacienteNombre={pacienteNombre}
						ecoNombre={cita.eco_nombre ?? ""}
						onClose={() => setShowResultados(false)}
					/>
				);
			})()}
		</>
	);
};

export default VerCitaPacienteModal;
