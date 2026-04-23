/**
 * Lista de citas del paciente: tabla (desktop) y cards (móvil).
 * Fecha con slice(0,4) para el año (evita 20260). Mostrador con ? : null (evita "0" → "AMO").
 */
import type { CitaPacienteCompleta } from "../citasApi";
import { Check, Eye, X, HeartPulse, Stethoscope, CalendarDays, Clock, User } from "lucide-react";

function formatFecha(val: string): string {
	if (!val || typeof val !== "string") return "—";
	const part = val.includes("T") ? val.split("T")[0] : val.trim().slice(0, 10);
	if (part.length < 10) return "—";
	return part.slice(8, 10) + "/" + part.slice(5, 7) + "/" + part.slice(0, 4);
}

function formatHora(value: string): string {
	if (!value) return "";
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
}

type Props = {
	citas: CitaPacienteCompleta[];
	onVerCita: (cita: CitaPacienteCompleta) => void;
	getEstadoPagoLabel: (estado: number) => string;
};

export default function ListaCitasPaciente({ citas, onVerCita, getEstadoPagoLabel }: Props) {
	return (
		<div className="flex-1 min-h-0 flex flex-col">
			{/* Tabla - desktop/tablet */}
			<div className="overflow-x-auto hidden md:block flex-1">
				<table className="w-full min-w-[640px] text-left text-base">
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
						{citas.map((cita) => {
							const estadoPago = cita.estado_pago ?? cita.pago_estado_pago ?? 0;
							const fechaStr = formatFecha(cita.fecha_cita);
							return (
								<tr key={cita.id_cita} className="hover:bg-cloud/30">
									<td className="px-4 py-3 text-brand-900">
										<div className="flex items-center gap-1.5">
											{fechaStr}
											{cita.es_vinculada_mostrador ? (
												<span className="rounded bg-brand-200 px-1.5 py-0.5 text-[10px] font-medium text-brand-800" title="Cita de mostrador">
													Mostrador
												</span>
											) : null}
										</div>
									</td>
									<td className="px-4 py-3 text-brand-900">{formatHora(cita.hora_cita)}</td>
									<td className="px-4 py-3 text-brand-900">
										{cita.especialista_nombre} {cita.especialista_apellido}
									</td>
									<td className="px-4 py-3 text-brand-900">{cita.eco_nombre}</td>
									<td className="px-4 py-3">
										{cita.id_representado ? (
											<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" title="Representado">
												<Check className="h-4 w-4" />
											</span>
										) : (
											<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-200 text-brand-600" title="Titular">
												<X className="h-4 w-4" />
											</span>
										)}
									</td>
									<td className="px-4 py-3">
										<span
											className={`inline-flex rounded-full px-2 py-1 text-sm font-medium ${
												estadoPago === 0 ? "bg-amber-400 text-brand-900" : estadoPago === 1 ? "bg-emerald-600 text-paper" : "bg-red-500 text-paper"
											}`}
										>
											{getEstadoPagoLabel(estadoPago)}
										</span>
									</td>
									<td className="px-4 py-3">
										<button
											type="button"
											onClick={() => onVerCita(cita)}
											className="inline-flex items-center gap-1 rounded-lg border border-brand-600 bg-brand-50 px-2 py-1.5 text-sm font-medium text-brand-800 hover:bg-brand-100"
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
			<div className="md:hidden space-y-4 py-3 px-1">
				{citas.map((cita) => {
					const estadoPago = cita.estado_pago ?? cita.pago_estado_pago ?? 0;
					return (
						<div
							key={cita.id_cita}
							className="flex flex-col gap-4 rounded-3xl border border-brand-200/50 bg-white p-5 shadow-[0px_4px_16px_rgba(0,0,0,0.03)] relative overflow-hidden"
						>
							<div className="flex items-start justify-between gap-3 relative z-10 w-full min-w-0">
								<div className="flex items-start gap-4 min-w-0 flex-1">
									<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-sm">
										<HeartPulse className="h-6 w-6" />
									</div>
									<div className="min-w-0 flex-1">
										<h3 className="truncate font-headline text-lg font-bold text-brand-900 leading-tight mb-1">
											{cita.eco_nombre}
										</h3>
										<p className="flex items-center gap-1.5 text-sm font-medium text-brand-600 truncate">
											<Stethoscope className="h-4 w-4 shrink-0" />
											<span className="truncate">{cita.especialista_nombre} {cita.especialista_apellido}</span>
										</p>
									</div>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3 bg-brand-50/50 rounded-2xl p-4 border border-brand-100">
								<div>
									<p className="text-[10px] font-bold uppercase tracking-wider text-brand-400 mb-1 flex items-center gap-1">
										<CalendarDays className="h-3 w-3" /> Fecha
									</p>
									<p className="text-sm font-semibold text-brand-900">
										{formatFecha(cita.fecha_cita)}
									</p>
								</div>
								<div>
									<p className="text-[10px] font-bold uppercase tracking-wider text-brand-400 mb-1 flex items-center gap-1">
										<Clock className="h-3 w-3" /> Hora
									</p>
									<p className="text-sm font-semibold text-brand-900">
										{formatHora(cita.hora_cita)}
									</p>
								</div>
								
								<div className="col-span-2 pt-2 border-t border-brand-200/50 mt-1 flex justify-between items-center">
									<div className="flex items-center gap-2">
										<span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">Paciente:</span>
										{cita.id_representado ? (
											<span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
												<Check className="h-3 w-3" /> Representado
											</span>
										) : (
											<span className="inline-flex items-center gap-1 rounded bg-brand-200 px-2 py-0.5 text-[10px] font-bold text-brand-800">
												<User className="h-3 w-3" /> Titular
											</span>
										)}
									</div>
									{cita.es_vinculada_mostrador && (
										<span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
											Mostrador
										</span>
									)}
								</div>
							</div>

							<div className="flex flex-wrap items-center justify-between gap-3 pt-1">
								<span
									className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide uppercase shrink-0 ${
										estadoPago === 0 
											? "bg-amber-100 text-amber-800" 
											: estadoPago === 1 
												? "bg-emerald-100 text-emerald-800" 
												: "bg-red-100 text-red-800"
									}`}
								>
									{getEstadoPagoLabel(estadoPago)}
								</span>
								<button
									type="button"
									onClick={() => onVerCita(cita)}
									className="inline-flex items-center gap-2 rounded-xl bg-brand-800 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-900 transition-colors w-full sm:w-auto justify-center"
								>
									<Eye className="h-4 w-4" />
									Ver detalles
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
