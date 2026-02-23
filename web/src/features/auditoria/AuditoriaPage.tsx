import { useState, useMemo } from "react";
import {
	RefreshCw,
	Search,
	ShieldAlert,
	User,
	Clock,
	Activity,
} from "lucide-react";
import { PageShell } from "../../shared";
import {
	useGetAuditoriaEventosQuery,
	useGetAuditoriaUsuariosQuery,
	type AuditoriaFilters,
} from "./auditoriaApi";

const METODOS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const ITEMS_PER_PAGE = 10;

const METODO_COLOR: Record<string, string> = {
	GET:    "bg-blue-100 text-blue-700",
	POST:   "bg-green-100 text-green-700",
	PUT:    "bg-yellow-100 text-yellow-700",
	PATCH:  "bg-orange-100 text-orange-700",
	DELETE: "bg-red-100 text-red-700",
};

function formatFecha(iso: string) {
	const d = new Date(iso);
	return d.toLocaleString("es-VE", {
		year:   "numeric",
		month:  "2-digit",
		day:    "2-digit",
		hour:   "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

const AuditoriaPage = () => {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");

	// Filtros
	const [filtroUsuario,    setFiltroUsuario]    = useState("");
	const [filtroMetodo,     setFiltroMetodo]     = useState("");
	const [filtroEstado,     setFiltroEstado]     = useState("");
	const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
	const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

	const queryFilters: AuditoriaFilters = useMemo(() => ({
		usuarioId:  filtroUsuario    || undefined,
		metodo:     filtroMetodo     || undefined,
		estado:     filtroEstado     || undefined,
		fechaDesde: filtroFechaDesde || undefined,
		fechaHasta: filtroFechaHasta || undefined,
		page,
		limit: ITEMS_PER_PAGE,
	}), [filtroUsuario, filtroMetodo, filtroEstado, filtroFechaDesde, filtroFechaHasta, page]);

	const {
		data,
		isLoading,
		isFetching,
		refetch,
	} = useGetAuditoriaEventosQuery(queryFilters);

	const { data: usuariosData } = useGetAuditoriaUsuariosQuery();

	const eventos  = data?.data    ?? [];
	const total    = data?.total   ?? 0;
	const totalPgs = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

	// Filtro local por texto de búsqueda (acción o usuario)
	const eventosFiltrados = useMemo(() => {
		if (!search.trim()) return eventos;
		const q = search.toLowerCase();
		return eventos.filter(
			(e) =>
				e.accion.toLowerCase().includes(q) ||
				(e.usuario_nombre ?? "").toLowerCase().includes(q) ||
				(e.usuario_correo ?? "").toLowerCase().includes(q) ||
				e.ruta.toLowerCase().includes(q),
		);
	}, [eventos, search]);

	const handleFiltroChange = () => {
		setPage(1);
	};

	const limpiarFiltros = () => {
		setFiltroUsuario("");
		setFiltroMetodo("");
		setFiltroEstado("");
		setFiltroFechaDesde("");
		setFiltroFechaHasta("");
		setSearch("");
		setPage(1);
	};

	const hayFiltros = filtroUsuario || filtroMetodo || filtroEstado || filtroFechaDesde || filtroFechaHasta;

	return (
		<PageShell
			title="Auditoría de Eventos del Sistema"
			description="Registro de todas las acciones realizadas por los usuarios en el sistema."
		>
			<div className="space-y-4">
				{/* ── Barra superior ─────────────────────────────────────── */}
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<ShieldAlert className="h-5 w-5 text-indigo-600" />
						<span className="text-sm font-medium text-gray-700">
							{total.toLocaleString("es-VE")} evento{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}
						</span>
					</div>
					<button
						type="button"
						onClick={() => refetch()}
						disabled={isFetching}
						className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
					>
						<RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
						Recargar Registros
					</button>
				</div>

				{/* ── Filtros ─────────────────────────────────────────────── */}
				<div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<p className="mb-3 text-sm font-semibold text-gray-700">Filtro y Acciones</p>
					<div className="flex flex-wrap gap-3">
						{/* Búsqueda rápida */}
						<div className="relative flex-1 min-w-[200px]">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
							<input
								type="text"
								placeholder="Buscar acción, usuario, ruta..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
							/>
						</div>

						{/* Filtro por usuario */}
						<select
							value={filtroUsuario}
							onChange={(e) => { setFiltroUsuario(e.target.value); handleFiltroChange(); }}
							className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
						>
							<option value="">Mostrar todos los usuarios</option>
							{(usuariosData?.data ?? []).map((u) => (
								<option key={u.usuario_id} value={u.usuario_id}>
									{u.usuario_nombre?.trim() || u.usuario_correo} ({u.usuario_rol})
								</option>
							))}
						</select>

						{/* Filtro por método */}
						<select
							value={filtroMetodo}
							onChange={(e) => { setFiltroMetodo(e.target.value); handleFiltroChange(); }}
							className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
						>
							<option value="">Todos los métodos</option>
							{METODOS.map((m) => (
								<option key={m} value={m}>{m}</option>
							))}
						</select>

						{/* Filtro por estado */}
						<select
							value={filtroEstado}
							onChange={(e) => { setFiltroEstado(e.target.value); handleFiltroChange(); }}
							className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
						>
							<option value="">Todos los estados</option>
							<option value="exito">Éxito</option>
							<option value="fallo">Fallo</option>
						</select>

						{/* Filtro desde */}
						<input
							type="date"
							value={filtroFechaDesde}
							onChange={(e) => { setFiltroFechaDesde(e.target.value); handleFiltroChange(); }}
							className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
						/>

						{/* Filtro hasta */}
						<input
							type="date"
							value={filtroFechaHasta}
							onChange={(e) => { setFiltroFechaHasta(e.target.value); handleFiltroChange(); }}
							className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
						/>

						{hayFiltros && (
							<button
								type="button"
								onClick={limpiarFiltros}
								className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
							>
								Limpiar filtros
							</button>
						)}
					</div>
				</div>

				{/* ── Tabla ───────────────────────────────────────────────── */}
				<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-100 text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-600">
										ID Evento
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-600">
										<span className="flex items-center gap-1.5">
											<User className="h-4 w-4" />
											Usuario
										</span>
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-600">
										<span className="flex items-center gap-1.5">
											<Activity className="h-4 w-4" />
											Acción Realizada
										</span>
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-600">
										Método
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-600">
										<span className="flex items-center gap-1.5">
											<Clock className="h-4 w-4" />
											Fecha y Hora
										</span>
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-600">
										Estado
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-50">
								{isLoading ? (
									<tr>
										<td colSpan={6} className="py-16 text-center text-gray-400">
											<RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin opacity-50" />
											Cargando eventos...
										</td>
									</tr>
								) : eventosFiltrados.length === 0 ? (
									<tr>
										<td colSpan={6} className="py-16 text-center text-gray-400">
											<ShieldAlert className="mx-auto mb-2 h-8 w-8 opacity-30" />
											No hay eventos que coincidan con los filtros
										</td>
									</tr>
								) : (
									eventosFiltrados.map((ev) => {
										const nombreUsuario = ev.usuario_nombre?.trim() || ev.usuario_correo || "Sistema";
										const esExito = ev.estado === "exito";

										return (
											<tr
												key={ev.id}
												className="transition-colors hover:bg-gray-50/60"
											>
												{/* ID */}
												<td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">
													#{ev.id}
												</td>

												{/* Usuario */}
												<td className="px-4 py-3">
													<div className="flex items-center gap-2">
														<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
															{nombreUsuario.charAt(0).toUpperCase()}
														</div>
														<div className="min-w-0">
															<p className="truncate font-medium text-gray-800 max-w-[160px]">
																{nombreUsuario}
															</p>
															{ev.usuario_rol && (
																<p className="truncate text-xs text-gray-400 capitalize">
																	{ev.usuario_rol}
																</p>
															)}
														</div>
													</div>
												</td>

												{/* Acción */}
												<td className="px-4 py-3">
													<p className="text-gray-700">{ev.accion}</p>
													<p className="mt-0.5 font-mono text-[11px] text-gray-400 truncate max-w-[220px]">
														{ev.ruta}
													</p>
												</td>

												{/* Método */}
												<td className="whitespace-nowrap px-4 py-3">
													<span
														className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tracking-wide ${METODO_COLOR[ev.metodo] ?? "bg-gray-100 text-gray-600"}`}
													>
														{ev.metodo}
													</span>
												</td>

												{/* Fecha */}
												<td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
													{formatFecha(ev.fecha)}
												</td>

												{/* Estado */}
												<td className="whitespace-nowrap px-4 py-3">
													<span
														className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
															esExito
																? "bg-green-100 text-green-700"
																: "bg-red-100 text-red-700"
														}`}
													>
														<span
															className={`h-1.5 w-1.5 rounded-full ${
																esExito ? "bg-green-500" : "bg-red-500"
															}`}
														/>
														{esExito ? "ÉXITO" : "FALLO"}
													</span>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>

					{/* ── Paginación (estilo Todas las citas) ───────────────── */}
					{total > ITEMS_PER_PAGE && (
						<div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
							<p className="text-sm text-gray-600">
								Mostrando {(page - 1) * ITEMS_PER_PAGE + 1} -{" "}
								{Math.min(page * ITEMS_PER_PAGE, total)} de {total.toLocaleString("es-VE")} eventos
							</p>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1 || isFetching}
									className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Anterior
								</button>
								<span className="text-xs text-gray-600">
									Página {page} de {totalPgs}
								</span>
								<button
									type="button"
									onClick={() => setPage((p) => Math.min(totalPgs, p + 1))}
									disabled={page >= totalPgs || isFetching}
									className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Siguiente
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</PageShell>
	);
};

export default AuditoriaPage;
