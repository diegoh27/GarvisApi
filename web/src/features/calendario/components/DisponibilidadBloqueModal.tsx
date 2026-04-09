import { useEffect, useMemo, useState } from "react";
import type { Disponibilidad, TimeOption } from "../types";
import { estadoDisponibilidadNum } from "../utils/disponibilidadEstado";
import { parseTimeToMinutes } from "../utils/slotUtils";
import { normalizeHoraDb } from "../utils/segmentBloquesUtils";
import { Pencil, X } from "lucide-react";

function minutesToHoraStr(m: number): string {
	const h = Math.floor(m / 60);
	const min = m % 60;
	return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
}

export type DisponibilidadSegmentContext = {
	bloque: Disponibilidad;
	dayKey: string;
	startSlot: number;
	endSlot: number;
	/** HH:MM:SS inicio del segmento (primer slot). */
	horaInicio: string;
	/** HH:MM:SS fin exclusivo del segmento (último slot + 20 min). */
	horaFin: string;
};

type Props = {
	open: boolean;
	context: DisponibilidadSegmentContext | null;
	timeOptions: TimeOption[];
	formatHora: (value: string) => string;
	/** Leyenda de fecha legible (ej. miércoles 25 de marzo de 2026). */
	formatFechaLarga: (dayKey: string) => string;
	loading: boolean;
	onClose: () => void;
	/** Enviar nuevas horas (pendiente/aprobada o solicitud macro). */
	onEnviarCambio: (nuevaHoraInicio: string, nuevaHoraFin: string) => Promise<void>;
	/** Cancelar disponibilidad del tramo completo. */
	onCancelarDisponibilidad: () => Promise<void>;
	/** Solo estado cancelado: crear de nuevo solicitud pendiente. */
	onVolverASolicitar: () => Promise<void>;
};

function labelEstado(b: Disponibilidad): string {
	const est = estadoDisponibilidadNum(b.estado);
	const id = String(b.id_disponibilidad ?? "");
	if (id.startsWith("solicitud-")) return "Solicitud de jornada pendiente";
	if (est === 0) return "En espera de aprobación";
	if (est === 1) return "Disponibilidad aprobada";
	if (est === 3) return "Cancelada por el especialista";
	return "Disponibilidad";
}

const DisponibilidadBloqueModal = ({
	open,
	context,
	timeOptions,
	formatHora,
	formatFechaLarga,
	loading,
	onClose,
	onEnviarCambio,
	onCancelarDisponibilidad,
	onVolverASolicitar,
}: Props) => {
	const [editando, setEditando] = useState(false);
	const [horaIniSel, setHoraIniSel] = useState("");
	const [horaFinSel, setHoraFinSel] = useState("");

	useEffect(() => {
		if (!open || !context) return;
		setEditando(false);
		setHoraIniSel(normalizeHoraDb(context.horaInicio));
		const finExclusivo = normalizeHoraDb(context.horaFin);
		const endMin = parseTimeToMinutes(finExclusivo);
		const lastSlotStart = Math.max(0, endMin - 20);
		setHoraFinSel(minutesToHoraStr(lastSlotStart));
	}, [open, context]);

	const rangoActualLabel = useMemo(() => {
		if (!context) return "";
		return `${formatHora(context.horaInicio)} – ${formatHora(context.horaFin)}`;
	}, [context, formatHora]);

	const rangoEditLabel = useMemo(() => {
		if (!horaIniSel || !horaFinSel) return "";
		const endMin = parseTimeToMinutes(horaFinSel) + 20;
		return `${formatHora(horaIniSel)} – ${formatHora(minutesToHoraStr(endMin))}`;
	}, [horaIniSel, horaFinSel, formatHora]);

	if (!open || !context) return null;

	const b = context.bloque;
	const est = estadoDisponibilidadNum(b.estado);
	const id = String(b.id_disponibilidad ?? "");
	const esSolicitudMacro = id.startsWith("solicitud-");
	const esCancelada = est === 3;
	const puedeGestionar = esCancelada
		? false
		: est === 0 || est === 1 || esSolicitudMacro;

	const fechaLarga = formatFechaLarga(context.dayKey);
	const ecoLine = (b.eco_nombre ?? "Eco").trim();

	const iniNew = parseTimeToMinutes(horaIniSel);
	const finExcNew = parseTimeToMinutes(horaFinSel) + 20;
	const iniOld = parseTimeToMinutes(normalizeHoraDb(context.horaInicio));
	const finExcOld = parseTimeToMinutes(normalizeHoraDb(context.horaFin));
	const cambioValido =
		finExcNew > iniNew && (iniNew !== iniOld || finExcNew !== finExcOld);

	return (
		<div
			className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 p-4"
			role="dialog"
			aria-modal
			aria-labelledby="disp-bloque-modal-title"
		>
			<div className="relative w-full max-w-md rounded-2xl border border-mist/80 bg-paper shadow-2xl">
				<div className="flex items-start justify-between gap-3 border-b border-mist/60 px-5 py-4">
					<div className="min-w-0">
						<p
							id="disp-bloque-modal-title"
							className="font-headline text-lg font-bold text-brand-900"
						>
							{labelEstado(b)}
						</p>
						<p className="mt-1 text-sm text-slate-600">{fechaLarga}</p>
						<p className="mt-2 text-sm font-semibold text-slate-800">{rangoActualLabel}</p>
						{ecoLine ? (
							<p className="mt-1 text-xs text-slate-500">{ecoLine}</p>
						) : null}
					</div>
					<div className="flex shrink-0 items-center gap-1">
						{puedeGestionar ? (
							<button
								type="button"
								className="rounded-lg p-2 text-slate-500 transition hover:bg-cloud hover:text-brand-800"
								aria-label="Editar horario"
								onClick={() => setEditando((v) => !v)}
							>
								<Pencil className="h-5 w-5" />
							</button>
						) : null}
						<button
							type="button"
							className="rounded-lg p-2 text-slate-400 transition hover:bg-cloud hover:text-slate-700"
							aria-label="Cerrar"
							onClick={onClose}
						>
							<X className="h-5 w-5" />
						</button>
					</div>
				</div>

				<div className="space-y-4 px-5 py-4">
					{editando && puedeGestionar ? (
						<div className="rounded-xl bg-cloud/80 p-4">
							<p className="text-xs font-bold uppercase tracking-wide text-slate-500">
								Nuevo horario (bloques de 20 min)
							</p>
							<div className="mt-3 grid grid-cols-2 gap-3">
								<label className="block text-xs font-medium text-slate-600">
									Desde
									<select
										className="mt-1 w-full rounded-lg border border-mist bg-paper px-2 py-2 text-sm"
										value={horaIniSel}
										onChange={(e) => setHoraIniSel(e.target.value)}
									>
										{timeOptions.map((o) => (
											<option key={o.value} value={o.value}>
												{o.label}
											</option>
										))}
									</select>
								</label>
								<label className="block text-xs font-medium text-slate-600">
									Hasta (último bloque)
									<select
										className="mt-1 w-full rounded-lg border border-mist bg-paper px-2 py-2 text-sm"
										value={horaFinSel}
										onChange={(e) => setHoraFinSel(e.target.value)}
									>
										{timeOptions.map((o) => (
											<option key={o.value} value={o.value}>
												{o.label}
											</option>
										))}
									</select>
								</label>
							</div>
							<p className="mt-2 text-xs text-slate-500">Vista previa: {rangoEditLabel}</p>
						</div>
					) : null}

					{esCancelada ? (
						<p className="text-sm text-slate-600">
							Este tramo está cancelado. Puedes volver a enviar una solicitud con el mismo rango
							y equipos al moderador.
						</p>
					) : (
						<p className="text-sm text-slate-600">
							Usa el lápiz para proponer otro horario; se notificará al moderador.{" "}
							<span className="font-medium text-slate-700">
								Cancelar disponibilidad
							</span>{" "}
							anula todo este tramo seleccionado (no es eliminar citas: si hubiera cita, no verías
							este panel).
						</p>
					)}
				</div>

				<div className="flex flex-col gap-2 border-t border-mist/60 px-5 py-4 sm:flex-row sm:justify-end">
					<button
						type="button"
						className="order-2 rounded-xl border border-mist px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-cloud sm:order-1"
						onClick={onClose}
						disabled={loading}
					>
						Cerrar
					</button>
					{esCancelada ? (
						<button
							type="button"
							className="order-1 rounded-xl bg-[#006965] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#055e5a] disabled:opacity-60 sm:order-2"
							disabled={loading}
							onClick={() => void onVolverASolicitar()}
						>
							{loading ? "Enviando…" : "Volver a solicitar"}
						</button>
					) : (
						<>
							<button
								type="button"
								className="order-3 rounded-xl border border-red-200 bg-red-50/90 px-4 py-2.5 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-60 sm:order-2"
								disabled={loading}
								onClick={() => void onCancelarDisponibilidad()}
							>
								{loading ? "Procesando…" : "Cancelar disponibilidad"}
							</button>
							{editando && puedeGestionar ? (
								<button
									type="button"
									className="order-1 rounded-xl bg-[#006965] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#055e5a] disabled:opacity-60 sm:order-3"
									disabled={
										loading ||
										!cambioValido ||
										parseTimeToMinutes(horaFinSel) <= parseTimeToMinutes(horaIniSel)
									}
									onClick={() =>
										void onEnviarCambio(
											horaIniSel,
											minutesToHoraStr(parseTimeToMinutes(horaFinSel) + 20),
										)
									}
								>
									{loading ? "Enviando…" : "Enviar cambio a moderación"}
								</button>
							) : null}
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default DisponibilidadBloqueModal;
