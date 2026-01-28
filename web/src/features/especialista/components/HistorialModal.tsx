import { useState } from "react";
import type { CitaEspecialista } from "../types";
import VerResultadosModal from "./VerResultadosModal";

type HistorialModalProps = {
	paciente: { id: string; name: string };
	citas: CitaEspecialista[];
	formatFecha: (value: string) => string;
	formatHora: (value: string) => string;
	getEstadoLabel: (cita: CitaEspecialista) => string;
	getResultadoLabel: (cita: CitaEspecialista) => string;
	onDownload?: (contenido: string, label: string) => void; // Opcional, ya no se usa
	onClose: () => void;
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
			// Si la URL no tiene protocolo pero parece ser de Cloudinary, agregar https://
			if (!trimmedUrl.match(/^https?:\/\//i) && trimmedUrl.includes("cloudinary")) {
				return `https://${trimmedUrl}`;
			}
			return trimmedUrl;
		});
	} catch {
		// Si no es JSON, tratar como string simple
		const trimmedUrl = archivo.trim();
		if (!trimmedUrl.match(/^https?:\/\//i) && trimmedUrl.includes("cloudinary")) {
			return [`https://${trimmedUrl}`];
		}
		return [trimmedUrl];
	}
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
}: HistorialModalProps) => {
	const [selectedCitaForResultados, setSelectedCitaForResultados] = useState<{
		archivos: string[];
		pacienteNombre: string;
		ecoNombre: string;
		idCita: string;
	} | null>(null);

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
								<th className="px-3 py-2">Estado</th>
								<th className="px-3 py-2">Resultado</th>
								<th className="px-3 py-2 text-center">Orden Médica</th>
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
									<td className="px-3 py-3">
										<span className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800">
											{getEstadoLabel(cita)}
										</span>
									</td>
									<td className="px-3 py-3">
										{(() => {
											const archivos = parseResultadoArchivo(cita.resultado_archivo);
											if (archivos.length > 0) {
												return (
													<button
														type="button"
														onClick={() => {
															// Abrir todos los archivos en nuevas pestañas con delay para evitar bloqueo del navegador
															archivos.forEach((url, index) => {
																setTimeout(() => {
																	window.open(url, "_blank", "noopener,noreferrer");
																}, index * 100); // 100ms de delay entre cada apertura
															});
														}}
														className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper"
													>
														{archivos.length === 1 ? "Ver resultado" : `Ver ${archivos.length} resultados`}
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
				pacienteNombre={selectedCitaForResultados.pacienteNombre}
				ecoNombre={selectedCitaForResultados.ecoNombre}
				idCita={selectedCitaForResultados.idCita}
				onClose={() => setSelectedCitaForResultados(null)}
			/>
		)}
	</div>
	);
};

export default HistorialModal;
