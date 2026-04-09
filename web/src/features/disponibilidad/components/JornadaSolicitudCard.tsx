import { Calendar, Clock, MapPin } from "lucide-react";
import type { DisponibilidadSegmento } from "../utils/groupDisponibilidadSegmentos";
import { duracionHorasSegmento } from "../utils/groupDisponibilidadSegmentos";
import { formatFechaConDiaDisponibilidad, formatHora } from "../utils/dateUtils";

type JornadaSolicitudCardProps = {
	segmento: DisponibilidadSegmento;
	onAprobar: (ids: string[]) => void;
	onArchivar: (ids: string[]) => void;
	disabled?: boolean;
};

const iniciales = (nombre: string, apellido: string) => {
	const a = (nombre || "").trim().charAt(0);
	const b = (apellido || "").trim().charAt(0);
	return `${a}${b}`.toUpperCase() || "?";
};

const badgeEstado = (estado: number) => {
	switch (estado) {
		case 0:
			return { label: "PENDIENTE", className: "bg-orange-50 text-orange-600" };
		case 1:
			return { label: "APROBADA", className: "bg-emerald-50 text-emerald-700" };
		case 2:
			return { label: "RECHAZADA", className: "bg-red-50 text-red-600" };
		case 3:
			return { label: "CANCELADA", className: "bg-slate-100 text-slate-600" };
		case 4:
			return { label: "CON CITA", className: "bg-sky-50 text-sky-700" };
		default:
			return { label: "—", className: "bg-zinc-100 text-zinc-500" };
	}
};

/**
 * Tarjeta estilo Bento para una jornada agregada (uno o más bloques consecutivos).
 */
const JornadaSolicitudCard = ({
	segmento,
	onAprobar,
	onArchivar,
	disabled = false,
}: JornadaSolicitudCardProps) => {
	const badge = badgeEstado(segmento.estado);
	const hrs = duracionHorasSegmento(segmento.hora_inicio, segmento.hora_fin);
	const hrsLabel = hrs >= 1 ? `${hrs.toFixed(1)} hrs` : `${Math.round(hrs * 60)} min`;
	const fechaLarga = formatFechaConDiaDisponibilidad(segmento.fecha);
	const ubicacion =
		segmento.eco_nombre?.trim() || "Equipo / consultorio (único recurso)";

	const puedeAprobar = segmento.estado === 0;
	const puedeArchivar = segmento.estado === 0;

	return (
		<div className="group flex h-full flex-col justify-between rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)]">
			<header className="mb-8 flex items-start justify-between">
				<div className="flex items-center gap-4">
					<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-100 bg-[#006965]/10 text-lg font-bold text-[#006965]">
						{iniciales(segmento.nombre, segmento.apellido)}
					</div>
					<div>
						<h3 className="font-bold tracking-tight text-zinc-800">
							Dr./Dra. {segmento.nombre} {segmento.apellido}
						</h3>
						<p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
							{segmento.especialidad}
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
					<span className="text-sm font-medium capitalize text-zinc-600">
						{fechaLarga}
					</span>
				</div>
				<div className="group/item flex items-center gap-4">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 transition-colors group-hover/item:text-[#006965]">
						<Clock className="h-4 w-4" />
					</div>
					<span className="text-sm font-medium text-zinc-600">
						{formatHora(segmento.hora_inicio)} — {formatHora(segmento.hora_fin)} ({hrsLabel})
					</span>
				</div>
				<div className="group/item flex items-center gap-4">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 transition-colors group-hover/item:text-[#006965]">
						<MapPin className="h-4 w-4" />
					</div>
					<span className="text-sm font-medium text-zinc-600">{ubicacion}</span>
				</div>
				{segmento.ids.length > 1 && (
					<p className="text-xs text-zinc-400">
						{segmento.ids.length} bloques de 20 min · un solo turno
					</p>
				)}
			</div>

			<footer className="flex items-center gap-3 border-t border-zinc-50 pt-6">
				<button
					type="button"
					disabled={disabled || !puedeAprobar}
					onClick={() => onAprobar(segmento.ids)}
					className="flex-1 rounded-xl bg-emerald-50 py-3 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
				>
					Aprobar Turno
				</button>
				<button
					type="button"
					disabled={disabled || !puedeArchivar}
					onClick={() => onArchivar(segmento.ids)}
					className="px-4 py-3 text-sm font-semibold text-zinc-400 transition-all hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
				>
					Archivar
				</button>
			</footer>
		</div>
	);
};

export default JornadaSolicitudCard;
