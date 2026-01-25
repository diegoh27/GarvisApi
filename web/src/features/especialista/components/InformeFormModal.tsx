import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import {
	useGetInformeByCitaQuery,
	useCreateOrUpdateInformeMutation,
	type CrearInformePayload,
} from "../informesApi";
import PDFViewerModal from "./PDFViewerModal";
import type { CitaEspecialista } from "../types";

type InformeFormModalProps = {
	cita: CitaEspecialista;
	onClose: () => void;
	onSuccess?: () => void;
};

const InformeFormModal = ({
	cita,
	onClose,
	onSuccess,
}: InformeFormModalProps) => {
	const [reseña, setReseña] = useState("");
	const [recomendaciones, setRecomendaciones] = useState("");
	const [showPDFViewer, setShowPDFViewer] = useState(false);
	const [pdfFileName, setPdfFileName] = useState<string | null>(null);

	const { data: informeExistente, isLoading: loadingInforme } =
		useGetInformeByCitaQuery(cita.id_cita, {
			skip: !cita.id_cita,
		});

	const [createOrUpdateInforme, { isLoading: saving }] =
		useCreateOrUpdateInformeMutation();

	// Cargar datos existentes si hay informe
	useEffect(() => {
		if (informeExistente) {
			setReseña(informeExistente.reseña || "");
			setRecomendaciones(informeExistente.recomendaciones || "");
		}
	}, [informeExistente]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validar que la cita esté atendida
		if (Number(cita.estado_cita) !== 3) {
			await Swal.fire({
				title: "Cita no atendida",
				text: "Solo se pueden crear informes para citas que han sido atendidas.",
				icon: "warning",
				confirmButtonColor: "#1C837F",
			});
			return;
		}

		if (!reseña.trim()) {
			Swal.fire({
				title: "Campo requerido",
				text: "Por favor completa la reseña",
				icon: "warning",
				confirmButtonColor: "#1C837F",
			});
			return;
		}

		try {
			const payload: CrearInformePayload = {
				id_cita: cita.id_cita,
				reseña: reseña.trim(),
			};
			// Solo incluir recomendaciones si tiene valor
			if (recomendaciones.trim()) {
				payload.recomendaciones = recomendaciones.trim();
			}
			await createOrUpdateInforme(payload).unwrap();

			await Swal.fire({
				title: "¡Éxito!",
				text: "Informe generado y guardado correctamente. El PDF está disponible para descargar.",
				icon: "success",
				confirmButtonColor: "#1C837F",
			});

			onSuccess?.();
			onClose();
		} catch (error: any) {
			await Swal.fire({
				title: "Error",
				text: error?.data?.message || "No se pudo guardar el informe",
				icon: "error",
				confirmButtonColor: "#1C837F",
			});
		}
	};

	const fullName = `${cita.paciente_nombre} ${cita.paciente_apellido}`;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="flex h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-paper shadow-xl">
				{/* Header - Fijo */}
				<div className="flex-shrink-0 border-b border-mist bg-paper p-5">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-semibold text-brand-900">
								{informeExistente ? "Editar informe" : "Crear informe"}
							</h2>
							<p className="mt-1 text-sm text-brand-800">
								{fullName} · {cita.eco_nombre}
							</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="rounded-full p-2 text-brand-800 transition-colors hover:bg-cloud"
						>
							<svg
								className="h-5 w-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				</div>

				{/* Form - Con scroll */}
				{loadingInforme ? (
					<div className="flex flex-1 items-center justify-center p-6 text-brand-800">
						Cargando informe...
					</div>
				) : (
					<form
						onSubmit={handleSubmit}
						className="flex flex-1 flex-col overflow-hidden"
					>
						<div className="flex-1 space-y-5 overflow-y-auto p-6">
							{/* Reseña */}
							<div>
								<label
									htmlFor="reseña"
									className="block text-sm font-semibold text-brand-900"
								>
									Reseña <span className="text-red-500">*</span>
								</label>
								<p className="mt-1 text-xs text-brand-700">
									Describe lo que observaste en el estudio
								</p>
								<textarea
									id="reseña"
									value={reseña}
									onChange={(e) => setReseña(e.target.value)}
									rows={5}
									required
									className="mt-2 w-full resize-y rounded-lg border border-mist bg-cloud px-4 py-3 text-sm text-brand-900 placeholder:text-brand-600 outline-none transition-colors focus:border-brand-700 focus:bg-white"
									placeholder="Escribe aquí la reseña del estudio..."
								/>
							</div>

							{/* Recomendaciones */}
							<div>
								<label
									htmlFor="recomendaciones"
									className="block text-sm font-semibold text-brand-900"
								>
									Recomendaciones
								</label>
								<p className="mt-1 text-xs text-brand-700">
									Indica las recomendaciones para el paciente
								</p>
								<textarea
									id="recomendaciones"
									value={recomendaciones}
									onChange={(e) => setRecomendaciones(e.target.value)}
									rows={4}
									className="mt-2 w-full resize-y rounded-lg border border-mist bg-cloud px-4 py-3 text-sm text-brand-900 placeholder:text-brand-600 outline-none transition-colors focus:border-brand-700 focus:bg-white"
									placeholder="Escribe aquí las recomendaciones..."
								/>
							</div>

							{/* Información del PDF */}
							{informeExistente?.informe_pdf_url && (
								<div className="rounded-lg border border-mint bg-mint/10 p-4">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm font-semibold text-brand-900">
												PDF generado
											</p>
											<p className="mt-1 text-xs text-brand-700">
												El informe PDF está disponible para descargar
											</p>
										</div>
										<button
											type="button"
											onClick={() => {
												const fullName = `${cita.paciente_nombre} ${cita.paciente_apellido}`;
												const fileName = `Informe-${fullName}-${cita.fecha_cita}.pdf`.replace(/\s+/g, "-");
												setPdfFileName(fileName);
												setShowPDFViewer(true);
											}}
											className="rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-paper transition-colors hover:bg-brand-800"
										>
											Ver PDF
										</button>
									</div>
								</div>
							)}
						</div>

						{/* Botones de acción - Fijos en la parte inferior */}
						<div className="flex-shrink-0 border-t border-mist bg-paper p-5">
							<div className="flex justify-end gap-3">
								<button
									type="button"
									onClick={onClose}
									className="rounded-full border border-mist bg-cloud px-6 py-2.5 text-sm font-medium text-brand-800 transition-colors hover:border-brand-700 hover:bg-mint/20"
									disabled={saving}
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={saving || !reseña.trim()}
									className="rounded-full bg-brand-700 px-6 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{saving
										? "Generando PDF..."
										: informeExistente
											? "Actualizar informe"
											: "Generar informe PDF"}
								</button>
							</div>
						</div>
					</form>
				)}
			</div>

			{/* PDF Viewer Modal */}
			{showPDFViewer && informeExistente?.informe_pdf_url && (
				<PDFViewerModal
					pdfUrl={informeExistente.informe_pdf_url}
					fileName={pdfFileName || undefined}
					onClose={() => {
						setShowPDFViewer(false);
						setPdfFileName(null);
					}}
				/>
			)}
		</div>
	);
};

export default InformeFormModal;
