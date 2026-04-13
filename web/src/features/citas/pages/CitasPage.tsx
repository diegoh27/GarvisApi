import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
	useGetMisCitasCompletasQuery,
	useLazyGetCitasMostradorDisponiblesParaVincularQuery,
	useVincularCitasMostradorMutation,
} from "../citasApi";
import type { CitaPacienteCompleta, CitaMostradorDisponible } from "../citasApi";
import { VerCitaPacienteModal, ListaCitasPaciente } from "../components";
import { CalendarDays, ChevronLeft, ChevronRight, Link2 } from "lucide-react";

const PAGE_SIZE = 5;

/** Fecha DD/MM/YYYY; año = solo slice(0,4) para no mostrar 20260. */
function formatFechaCitaPaciente(val: string | null | undefined): string {
	if (val == null || typeof val !== "string") return "—";
	const part = String(val).trim().includes("T") ? String(val).trim().split("T")[0] : String(val).trim();
	if (part.length < 10) return "—";
	return part.slice(8, 10) + "/" + part.slice(5, 7) + "/" + part.slice(0, 4);
}

type FilterEstadoPago = "todos" | "pendiente" | "aprobado" | "negado";
type FilterResultados = "todos" | "con_resultados" | "sin_resultados";

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
	const [searchParams] = useSearchParams();
	const [filterEstadoPago, setFilterEstadoPago] = useState<FilterEstadoPago>(() => {
		const param = searchParams.get("pago");
		return param === "pendiente" || param === "aprobado" || param === "negado" ? param : "todos";
	});
	const [filterResultados, setFilterResultados] = useState<FilterResultados>(() => {
		const param = searchParams.get("resultados");
		return param === "con_resultados" || param === "sin_resultados" ? param : "todos";
	});
	const [page, setPage] = useState(1);
	const [selectedCita, setSelectedCita] = useState<CitaPacienteCompleta | null>(null);

	// Reclamar citas de mostrador
	const [cedulaMostrador, setCedulaMostrador] = useState("");
	const [disponibles, setDisponibles] = useState<CitaMostradorDisponible[] | null>(null);
	const [mensajeVinculacion, setMensajeVinculacion] = useState<string | null>(null);

	const { data: citas = [], isLoading, isError } = useGetMisCitasCompletasQuery();
	const [buscarDisponibles, { isFetching: buscandoDisponibles }] =
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
											<span>{formatFechaCitaPaciente(c.fecha_cita)}</span>
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
						<ListaCitasPaciente
							citas={paginated}
							onVerCita={setSelectedCita}
							getEstadoPagoLabel={getEstadoPagoLabel}
						/>

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
