import { useMemo, useState, useEffect } from "react";
import { useAuth } from "../../../shared";
import { useLocation } from "react-router-dom";
import { useGetMisCitasQuery } from "../especialistaApi";
import { useGetMisInformesQuery } from "../informesApi";
import InformeFormModal from "../components/InformeFormModal";
import PDFViewerModal from "../components/PDFViewerModal";
import type { CitaEspecialista } from "../types";

const getDateKey = (value: string | Date): string => {
	if (!value) return "";
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}
	return value.includes("T") ? value.split("T")[0] : value;
};

const formatFecha = (value: string | Date) => {
	const dateKey = getDateKey(value);
	const date = new Date(`${dateKey}T00:00:00`);
	if (Number.isNaN(date.getTime())) return String(value);
	return date.toLocaleDateString("es-VE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
};

const formatHora = (value: string) => {
	const [hourValue, minuteValue] = value.split(":");
	const hour = Number(hourValue);
	const period = hour >= 12 ? "PM" : "AM";
	const normalized = ((hour + 11) % 12) + 1;
	return `${normalized}:${minuteValue} ${period}`;
};

const InformesPage = () => {
	const { user } = useAuth();
	const location = useLocation();
	const isEspecialista = user?.rol === "especialista";
	const [selectedCitaId, setSelectedCitaId] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
	const [pdfFileName, setPdfFileName] = useState<string | null>(null);

	// Si viene desde otra página con una cita seleccionada, abrir el modal
	useEffect(() => {
		const state = location.state as { selectedCitaId?: string } | null;
		if (state?.selectedCitaId) {
			setSelectedCitaId(state.selectedCitaId);
			// Limpiar el state para que no se abra de nuevo al navegar
			window.history.replaceState({}, document.title);
		}
	}, [location.state]);

	const { data: citas = [], isLoading: loadingCitas } = useGetMisCitasQuery(
		undefined,
		{
			skip: !isEspecialista,
		}
	);

	const { data: informes = [], isLoading: loadingInformes } =
		useGetMisInformesQuery(undefined, {
			skip: !isEspecialista,
		});

	// Crear un mapa de informes por id_cita para búsqueda rápida
	const informesMap = useMemo(() => {
		const map = new Map<string, typeof informes[0]>();
		informes.forEach((informe) => {
			map.set(informe.id_cita, informe);
		});
		return map;
	}, [informes]);

	// Filtrar solo citas atendidas (estado_cita = 3) y combinar con información de informes
	const citasConInformes = useMemo(() => {
		return citas
			.filter((cita) => Number(cita.estado_cita) === 3) // Solo citas atendidas
			.map((cita) => ({
				...cita,
				informe: informesMap.get(cita.id_cita) || null,
				tieneInforme: informesMap.has(cita.id_cita),
			}));
	}, [citas, informesMap]);

	// Filtrar citas por búsqueda
	const filteredCitas = useMemo(() => {
		const normalized = query.trim().toLowerCase();
		if (!normalized) return citasConInformes;
		return citasConInformes.filter((cita) => {
			const haystack = `${cita.paciente_nombre} ${cita.paciente_apellido} ${cita.eco_nombre} ${getDateKey(cita.fecha_cita)}`.toLowerCase();
			return haystack.includes(normalized);
		});
	}, [citasConInformes, query]);

	if (!isEspecialista) {
		return (
			<div className="space-y-6">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold text-brand-900">Informes</h1>
					<p className="text-sm text-brand-800">
						Gestión de informes disponible para especialistas.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold text-brand-900">Informes</h1>
				<p className="text-sm text-brand-800">
					Genera y gestiona informes médicos. Solo se muestran citas que han sido atendidas.
				</p>
			</div>

			{/* Resumen */}
			<div className="grid gap-4 md:grid-cols-3">
				<div className="rounded-2xl bg-paper p-4 shadow-sm">
					<p className="text-xs font-semibold text-brand-800">
						Citas atendidas
					</p>
					<p className="mt-2 text-2xl font-semibold text-brand-900">
						{citasConInformes.length}
					</p>
				</div>
				<div className="rounded-2xl bg-paper p-4 shadow-sm">
					<p className="text-xs font-semibold text-brand-800">
						Informes completados
					</p>
					<p className="mt-2 text-2xl font-semibold text-brand-900">
						{informes.length}
					</p>
				</div>
				<div className="rounded-2xl bg-paper p-4 shadow-sm">
					<p className="text-xs font-semibold text-brand-800">
						Pendientes de informe
					</p>
					<p className="mt-2 text-2xl font-semibold text-brand-900">
						{citasConInformes.length - informes.length}
					</p>
				</div>
			</div>

			{/* Lista de citas */}
			<div className="rounded-2xl bg-paper p-6 shadow-sm">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-base font-semibold text-brand-900">
							Listado de citas atendidas
						</h2>
						<p className="text-xs text-brand-800">
							Busca por nombre, eco o fecha. Haz click en una cita para crear o ver su informe.
						</p>
					</div>
					<input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Buscar cita"
						className="h-10 rounded-full border border-mist bg-cloud px-4 text-xs text-brand-900 outline-none focus:border-brand-700"
					/>
				</div>

				{loadingCitas || loadingInformes ? (
					<p className="mt-4 text-sm text-brand-800">Cargando citas...</p>
				) : (
					<div className="mt-4 space-y-3">
						{filteredCitas.length ? (
							filteredCitas.map((cita) => {
								const fullName = `${cita.paciente_nombre} ${cita.paciente_apellido}`;
								const tieneInforme = cita.tieneInforme;
								return (
									<div
										key={cita.id_cita}
										className="cursor-pointer rounded-lg border border-mist bg-cloud p-4 transition-colors hover:border-brand-700 hover:bg-mint/10"
										onClick={() => setSelectedCitaId(cita.id_cita)}
									>
										<div className="flex items-center justify-between">
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<h3 className="font-semibold text-brand-900">
														{fullName}
													</h3>
													{tieneInforme ? (
														<span className="rounded-full bg-brand-700 px-2 py-1 text-[10px] text-paper">
															Con informe
														</span>
													) : (
														<span className="rounded-full bg-cloud px-2 py-1 text-[10px] text-brand-800">
															Sin informe
														</span>
													)}
												</div>
												<p className="mt-1 text-xs text-brand-800">
													{cita.eco_nombre} · {formatFecha(cita.fecha_cita)} ·{" "}
													{formatHora(cita.hora_cita)}
												</p>
											</div>
											<div className="ml-4 flex gap-2">
													{tieneInforme && cita.informe?.informe_pdf_url ? (
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																const fullName = `${cita.paciente_nombre} ${cita.paciente_apellido}`;
																const fileName = `Informe-${fullName}-${cita.fecha_cita}.pdf`.replace(/\s+/g, "-");
																setPdfFileName(fileName);
																setPdfViewerUrl(cita.informe!.informe_pdf_url!);
															}}
															className="rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-paper transition-colors hover:bg-brand-800"
														>
															Ver PDF
														</button>
													) : null}
												<button
													type="button"
													className="rounded-full border border-mint px-4 py-2 text-xs font-medium text-brand-800 transition-colors hover:border-brand-700 hover:bg-mint/20"
												>
													{tieneInforme ? "Editar informe" : "Crear informe"}
												</button>
											</div>
										</div>
									</div>
								);
							})
						) : (
							<p className="py-6 text-center text-sm text-brand-800">
								No hay citas para mostrar.
							</p>
						)}
					</div>
				)}
			</div>

			{/* Modal de formulario de informe */}
			{selectedCitaId && (
				<InformeFormModal
					cita={filteredCitas.find((c) => c.id_cita === selectedCitaId)!}
					onClose={() => setSelectedCitaId(null)}
					onSuccess={() => {
						setSelectedCitaId(null);
						// Los datos se actualizarán automáticamente gracias a RTK Query
					}}
				/>
			)}
			{pdfViewerUrl && (
				<PDFViewerModal
					pdfUrl={pdfViewerUrl}
					fileName={pdfFileName || undefined}
					onClose={() => {
						setPdfViewerUrl(null);
						setPdfFileName(null);
					}}
				/>
			)}
		</div>
	);
};

export default InformesPage;
