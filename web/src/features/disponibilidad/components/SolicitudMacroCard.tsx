import { Calendar, Clock, MapPin } from "lucide-react";
import type { DisponibilidadSolicitudMacro } from "../disponibilidadApi";
import { formatFechaCorta, formatHora, toDateKey } from "../utils/dateUtils";
import {
	countBloquesPrevistosMacro,
	duracionHorasMacro,
} from "../utils/macroSolicitudPreview";

const iniciales = (nombre: string, apellido: string) => {
	const a = (nombre || "").trim().charAt(0);
	const b = (apellido || "").trim().charAt(0);
	return `${a}${b}`.toUpperCase() || "?";
};

const formatRangoFechas = (desde: string, hasta: string) => {
	const a = formatFechaCorta(toDateKey(desde));
	const b = formatFechaCorta(toDateKey(hasta));
	if (!a || !b) return "—";
	return `${a} al ${b}`;
};

type SolicitudMacroCardProps = {
	solicitud: DisponibilidadSolicitudMacro;
	onAprobar: (id: string) => void;
	onArchivar: (id: string) => void;
	disabled?: boolean;
};

const SolicitudMacroCard = ({
	solicitud,
	onAprobar,
	onArchivar,
	disabled = false,
}: SolicitudMacroCardProps) => {
	const hrs = duracionHorasMacro(solicitud.hora_inicio, solicitud.hora_fin);
	const hrsLabel = hrs >= 1 ? `${hrs.toFixed(1)} hrs` : `${Math.round(hrs * 60)} min`;
	const previstos = countBloquesPrevistosMacro(
		toDateKey(solicitud.fecha_desde),
		toDateKey(solicitud.fecha_hasta),
		solicitud.hora_inicio,
		solicitud.hora_fin,
	);
	const ubicacion =
		solicitud.eco_nombre?.trim() || "Equipo / consultorio (único recurso)";
	const puede = solicitud.estado === 0;
	const badge =
		solicitud.estado === 0
			? { label: "PENDIENTE", className: "bg-orange-50 text-orange-600" }
			: solicitud.estado === 1
				? { label: "PROCESADA", className: "bg-emerald-50 text-emerald-700" }
				: solicitud.estado === 3
					? { label: "CANCELADA", className: "bg-slate-100 text-slate-600" }
					: { label: "ARCHIVADA", className: "bg-red-50 text-red-600" };

	return (
		<div className="group flex h-full flex-col justify-between rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)]">
			<header className="mb-8 flex items-start justify-between">
				<div className="flex items-center gap-4">
					<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-100 bg-[#006965]/10 text-lg font-bold text-[#006965]">
						{iniciales(solicitud.nombre, solicitud.apellido)}
					</div>
					<div>
						<h3 className="font-bold tracking-tight text-zinc-800">
							Dr./Dra. {solicitud.nombre} {solicitud.apellido}
						</h3>
						<p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
							{solicitud.especialidad}
							{solicitud.es_manual ? " · Manual" : ""}
						</p>
					</div>
				</div>
				<span
					className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider ${badge.className}`}
				>
					{badge.label}
				</span>
			</header>

			<div className="mb-8 space-y-4">
				<div className="group/item flex items-center gap-4">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 transition-colors group-hover/item:text-[#006965]">
						<Calendar className="h-4 w-4" />
					</div>
					<span className="text-base font-medium capitalize text-zinc-600">
						{formatRangoFechas(solicitud.fecha_desde, solicitud.fecha_hasta)}
					</span>
				</div>
				<div className="group/item flex items-center gap-4">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 transition-colors group-hover/item:text-[#006965]">
						<Clock className="h-4 w-4" />
					</div>
					<span className="text-base font-medium text-zinc-600">
						{formatHora(solicitud.hora_inicio)} — {formatHora(solicitud.hora_fin)} ({hrsLabel})
					</span>
				</div>
				<div className="group/item flex items-center gap-4">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 transition-colors group-hover/item:text-[#006965]">
						<MapPin className="h-4 w-4" />
					</div>
					<span className="text-base font-medium text-zinc-600">{ubicacion}</span>
				</div>
				<p className="text-sm text-zinc-400">
					{previstos} bloques de 20 min · un solo turno (se generan al aprobar)
				</p>
			</div>

			<footer className="flex items-center gap-3 border-t border-zinc-50 pt-6">
				<button
					type="button"
					disabled={disabled || !puede}
					onClick={() => onAprobar(solicitud.id_solicitud)}
					className="flex-1 rounded-xl bg-emerald-50 py-3 text-base font-bold text-emerald-700 transition-all hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
				>
					Aprobar Turno
				</button>
				<button
					type="button"
					disabled={disabled || !puede}
					onClick={() => onArchivar(solicitud.id_solicitud)}
					className="rounded-lg px-4 py-2 text-base font-medium text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
				>
					Rechazar
				</button>
			</footer>
		</div>
	);
};

export { SolicitudMacroCard };
