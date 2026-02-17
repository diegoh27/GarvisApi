import { useMemo, useState } from "react";
import {
	useGetMisCitasCompletasQuery,
	useLazyGetCitasMostradorDisponiblesParaVincularQuery,
	useVincularCitasMostradorMutation,
} from "../citasApi";
import type { CitaPacienteCompleta, CitaMostradorDisponible } from "../citasApi";
import { VerCitaPacienteModal } from "../components";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Eye, Link2, X } from "lucide-react";

const PAGE_SIZE = 5;

type FilterEstadoPago = "todos" | "pendiente" | "aprobado" | "negado";
type FilterResultados = "todos" | "con_resultados" | "sin_resultados";

const formatFecha = (value: string | null) => {
	if (!value) return "—";
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
	// Si viene como ISO (ej. 1970-01-01T06:00:00.000Z por columna TIME en MySQL), usar solo la parte de hora
	let timePart = String(value).trim();
	if (timePart.includes("T") && timePart.includes(":")) {
		const t = timePart.split("T")[1];
		timePart = t ? t.replace(/\.\d+Z?$/i, "").slice(0, 8) : timePart;
	}
	const [hourStr, minuteStr = "00"] = timePart.split(":");
	const minute = (minuteStr || "00").replace(/\D/g, "").slice(0, 2) || "00";
	const hour = Number(hourStr);
	if (Number.isNaN(hour)) return value;
	const period = hour >= 12 ? "PM" : "AM";
	const hour12 = hour % 12 === 0 ? 12 : hour % 12;
	return `${hour12}:${minute.padStart(2, "0")} ${period}`;
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
			return "—";
	}
};

const CitasPage = () => {
	const [filterEstadoPago, setFilterEstadoPago] = useState<FilterEstadoPago>("todos");
	const [filterResultados, setFilterResultados] = useState<FilterResultados>("todos");
	const [page, setPage] = useState(1);
	const [selectedCita, setSelectedCita] = useState<CitaPacienteCompleta | null>(null);

	// Reclamar citas de mostrador
	const [cedulaMostrador, setCedulaMostrador] = useState("");
	const [disponibles, setDisponibles] = useState<CitaMostradorDisponible[] | null>(null);
	const [mensajeVinculacion, setMensajeVinculacion] = useState<string | null>(null);

	const { data: citas = [], isLoading, isError } = useGetMisCitasCompletasQuery();
	const [buscarDisponibles, { data: citasDisponibles = [], isFetching: buscandoDisponibles }] =
		useLazyGetCitasMostradorDisponiblesParaVincularQuery();
	const [vincular, { isLoading: vinculando }] = useVincularCitasMostradorMutation();

	const filtered = useMemo(() => {
		let list = [...citas];
		const estadoPagoNum =
			filterEstadoPago === "pendiente"
				? 0
				: filterEstadoPago === "aprobado"
					? 1
					: filterEstadoPago === "negado"
						? 2
						: null;
		if (estadoPagoNum !== null) {
			list = list.filter((c) => (c.estado_pago ?? c.pago_estado_pago ?? 0) === estadoPagoNum);
		}
		if (filterResultados === "con_resultados") {
			list = list.filter((c) => c.resultado_archivo != null && c.resultado_archivo !== "");
		}
		if (filterResultados === "sin_resultados") {
			list = list.filter((c) => !c.resultado_archivo || c.resultado_archivo === "");
		}
		return list;
	}, [citas, filterEstadoPago, filterResultados]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const paginated = useMemo(() => {
		const start = (page - 1) * PAGE_SIZE;
		return filtered.slice(start, start + PAGE_SIZE);
	}, [filtered, page]);

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold text-brand-900">Mis citas</h1>
				<p className="text-sm text-brand-800">
					Consulta el estado de tus citas, pagos y documentos (resultados, informe y orden médica).
				</p>
			</div>

			{/* Reclamar citas de mostrador */}
			<div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
				<div className="flex items-center gap-2 text-brand-800">
					<Link2 className="h-5 w-5 shrink-0" />
					<h2 className="text-sm font-semibold">¿Viniste antes por mostrador?</h2>
				</div>
				<p className="mt-1 text-xs text-brand-700">
					Si te atendieron en mostrador, puedes asociar esas citas a tu cuenta con tu cédula para verlas aquí y que te suban los resultados.
				</p>
				<div className="mt-3 flex flex-wrap items-end gap-2">
					<div>
						<label htmlFor="cedula-mostrador" className="sr-only">Cédula</label>
						<input
							id="cedula-mostrador"
							type="text"
							value={cedulaMostrador}
							onChange={(e) => {
								setCedulaMostrador(e.target.value);
								setDisponibles(null);
								setMensajeVinculacion(null);
							}}
							placeholder="Ej: V28025174"
							className="rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 placeholder:text-brand-500 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-500 min-w-[140px]"
						/>
					</div>
					<button
						type="button"
						onClick={async () => {
							const ced = cedulaMostrador.trim();
							if (!ced) return;
							const result = await buscarDisponibles(ced);
							setDisponibles(Array.isArray(result.data) ? result.data : []);
						}}
						disabled={buscandoDisponibles || !cedulaMostrador.trim()}
						className="rounded-lg bg-brand-800 px-3 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-50"
					>
						{buscandoDisponibles ? "Buscando…" : "Buscar citas"}
					</button>
				</div>
				{disponibles !== null && (
					<div className="mt-3">
						{disponibles.length === 0 ? (
							<p className="text-sm text-brand-700">
								No hay citas de mostrador sin asociar con esa cédula. Si ya las asociaste, aparecen en la lista de abajo.
							</p>
						) : (
							<>
								<p className="text-sm font-medium text-brand-800">
									{disponibles.length} {disponibles.length === 1 ? "cita encontrada" : "citas encontradas"} con esa cédula:
								</p>
								<ul className="mt-2 space-y-1 rounded-lg border border-brand-200 bg-paper p-2 text-sm text-brand-900">
									{disponibles.map((c) => (
										<li key={c.id_cita} className="flex flex-wrap items-center gap-2">
											<span>{formatFecha(c.fecha_cita)}</span>
											<span>{c.eco_nombre}</span>
											<span className="text-brand-600">
												{c.especialista_nombre} {c.especialista_apellido}
											</span>
										</li>
									))}
								</ul>
								<button
									type="button"
									onClick={async () => {
										setMensajeVinculacion(null);
										try {
											const res = await vincular({ id_citas: disponibles!.map((c) => c.id_cita) }).unwrap();
											setMensajeVinculacion(
												res.vinculadas > 0
													? `Se asociaron ${res.vinculadas} cita(s) a tu cuenta. Ya aparecen en "Mis citas".`
													: res.message || "No se pudo asociar ninguna cita. Verifica que la cédula coincida con la de tu perfil."
											);
											if (res.vinculadas > 0) {
												setDisponibles(null);
												setCedulaMostrador("");
											}
										} catch (e: unknown) {
											const msg = e && typeof e === "object" && "data" in e && e.data && typeof e.data === "object" && "message" in e.data
												? String((e.data as { message: string }).message)
												: "Error al asociar. Intenta de nuevo.";
											setMensajeVinculacion(msg);
										}
									}}
									disabled={vinculando}
									className="mt-2 rounded-lg bg-brand-800 px-3 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-50"
								>
									{vinculando ? "Asociando…" : "Asociar todas a mi cuenta"}
								</button>
							</>
						)}
						{mensajeVinculacion && (
							<p className={`mt-2 text-sm ${mensajeVinculacion.startsWith("Se asociaron") ? "text-emerald-700" : "text-amber-800"}`}>
								{mensajeVinculacion}
							</p>
						)}
					</div>
				)}
			</div>

			{/* Filtros */}
			<div className="flex flex-wrap items-center gap-4 rounded-xl border border-mist bg-paper p-4">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-brand-800">Estado del pago:</span>
					<select
						value={filterEstadoPago}
						onChange={(e) => {
							setFilterEstadoPago(e.target.value as FilterEstadoPago);
							setPage(1);
						}}
						className="rounded-lg border border-brand-300 bg-paper px-3 py-1.5 text-sm text-brand-900 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
					>
						<option value="todos">Todos</option>
						<option value="pendiente">Pendientes</option>
						<option value="aprobado">Aprobados</option>
						<option value="negado">Negados</option>
					</select>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-brand-800">Resultados:</span>
					<select
						value={filterResultados}
						onChange={(e) => {
							setFilterResultados(e.target.value as FilterResultados);
							setPage(1);
						}}
						className="rounded-lg border border-brand-300 bg-paper px-3 py-1.5 text-sm text-brand-900 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
					>
						<option value="todos">Todos</option>
						<option value="con_resultados">Con resultados</option>
						<option value="sin_resultados">Sin resultados</option>
					</select>
				</div>
				<div className="ml-auto text-sm text-brand-700">
					{filtered.length} {filtered.length === 1 ? "cita" : "citas"}
				</div>
			</div>

			{/* Listado */}
			<div className="rounded-xl border border-mist bg-paper shadow-sm overflow-hidden md:min-h-[26rem] flex flex-col">
				{isLoading ? (
					<div className="flex items-center justify-center py-16">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
					</div>
				) : isError ? (
					<div className="py-8 text-center text-sm text-red-600">
						No se pudo cargar la lista de citas. Intenta de nuevo más tarde.
					</div>
				) : paginated.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-brand-700">
						<CalendarDays className="mb-3 h-12 w-12 text-brand-400" />
						<p className="text-sm font-medium">No hay citas que coincidan con los filtros</p>
						<p className="mt-1 text-xs">Cambia los filtros o agenda una cita desde Disponibilidad.</p>
					</div>
				) : (
					<>
						<div className="flex-1 min-h-0">
							{/* Tabla - solo desktop/tablet */}
							<div className="overflow-x-auto hidden md:block h-full">
								<table className="w-full min-w-[640px] text-left text-sm">
									<thead className="border-b border-mist bg-cloud/50">
										<tr>
											<th className="px-4 py-3 font-semibold text-brand-900">Fecha</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Hora</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Especialista</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Estudio</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Representado</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Estado pago</th>
											<th className="px-4 py-3 font-semibold text-brand-900">Acciones</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-mist">
										{paginated.map((cita) => {
											const estadoPago = cita.estado_pago ?? cita.pago_estado_pago ?? 0;
											return (
												<tr key={cita.id_cita} className="hover:bg-cloud/30">
													<td className="px-4 py-3 text-brand-900">
														<div className="flex items-center gap-1.5">
															{formatFecha(cita.fecha_cita)}
															{cita.es_vinculada_mostrador && (
																<span className="rounded bg-brand-200 px-1.5 py-0.5 text-[10px] font-medium text-brand-800" title="Cita de mostrador asociada a tu cuenta">
																	Mostrador
																</span>
															)}
														</div>
													</td>
													<td className="px-4 py-3 text-brand-900">{formatHora(cita.hora_cita)}</td>
													<td className="px-4 py-3 text-brand-900">
														{cita.especialista_nombre} {cita.especialista_apellido}
													</td>
													<td className="px-4 py-3 text-brand-900">{cita.eco_nombre}</td>
													<td className="px-4 py-3">
														{cita.id_representado ? (
															<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" title="Cita para representado">
																<Check className="h-4 w-4" />
															</span>
														) : (
															<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-200 text-brand-600" title="Cita para el paciente">
																<X className="h-4 w-4" />
															</span>
														)}
													</td>
													<td className="px-4 py-3">
														<span
															className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${estadoPago === 0
																? "bg-amber-400 text-brand-900"
																: estadoPago === 1
																	? "bg-emerald-600 text-paper"
																	: "bg-red-500 text-paper"
																}`}
														>
															{getEstadoPagoLabel(estadoPago)}
														</span>
													</td>
													<td className="px-4 py-3">
														<button
															type="button"
															onClick={() => setSelectedCita(cita)}
															className="inline-flex items-center gap-1 rounded-lg border border-brand-600 bg-brand-50 px-2 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-100"
														>
															<Eye className="h-3.5 w-3.5" />
															Ver cita
														</button>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							{/* Cards - móvil */}
							<div className="md:hidden space-y-3 py-3">
								{paginated.map((cita) => {
									const estadoPago = cita.estado_pago ?? cita.pago_estado_pago ?? 0;
									return (
										<div
											key={cita.id_cita}
											className="rounded-2xl border border-brand-200 bg-paper px-4 py-3 shadow-xs"
										>
											<div className="flex items-center justify-between gap-2">
												<div>
													<p className="text-xs font-semibold text-brand-700">
														{formatFecha(cita.fecha_cita)} • {formatHora(cita.hora_cita)}
														{cita.es_vinculada_mostrador && (
															<span className="ml-1.5 rounded bg-brand-200 px-1.5 py-0.5 text-[10px] font-medium text-brand-800">Mostrador</span>
														)}
													</p>
													<p className="mt-1 text-sm font-semibold text-brand-900">
														{cita.eco_nombre}
													</p>
													<p className="mt-0.5 text-xs text-brand-700">
														{cita.especialista_nombre} {cita.especialista_apellido}
													</p>
													<p className="mt-0.5 text-xs text-brand-600">
														Representado: {cita.id_representado ? (
															<span className="inline-flex items-center gap-0.5 text-emerald-700">
																<Check className="h-3 w-3" /> Sí
															</span>
														) : (
															<span className="inline-flex items-center gap-0.5 text-brand-600">
																<X className="h-3 w-3" /> No
															</span>
														)}
													</p>
												</div>
												<span
													className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${estadoPago === 0
														? "bg-amber-400/90 text-brand-900"
														: estadoPago === 1
															? "bg-emerald-600 text-paper"
															: "bg-red-500 text-paper"
														}`}
												>
													{getEstadoPagoLabel(estadoPago)}
												</span>
											</div>
											<div className="mt-3 flex justify-end">
												<button
													type="button"
													onClick={() => setSelectedCita(cita)}
													className="inline-flex items-center gap-1 rounded-full border border-brand-600 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-100"
												>
													<Eye className="h-3.5 w-3.5" />
													Ver cita
												</button>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						{/* Paginación */}
						{totalPages > 1 && (
							<div className="flex items-center justify-between border-t border-mist bg-cloud/30 px-4 py-3">
								<p className="text-xs text-brand-700">
									Página {page} de {totalPages}
								</p>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => setPage((p) => Math.max(1, p - 1))}
										disabled={page <= 1}
										className="rounded-lg border border-brand-300 bg-paper p-2 text-brand-800 hover:bg-cloud disabled:opacity-50 disabled:pointer-events-none"
										aria-label="Anterior"
									>
										<ChevronLeft className="h-4 w-4" />
									</button>
									<button
										type="button"
										onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
										disabled={page >= totalPages}
										className="rounded-lg border border-brand-300 bg-paper p-2 text-brand-800 hover:bg-cloud disabled:opacity-50 disabled:pointer-events-none"
										aria-label="Siguiente"
									>
										<ChevronRight className="h-4 w-4" />
									</button>
								</div>
							</div>
						)}
					</>
				)}
			</div>

			{selectedCita && (
				<VerCitaPacienteModal
					cita={selectedCita}
					onClose={() => setSelectedCita(null)}
				/>
			)}
		</div>
	);
};

export default CitasPage;
