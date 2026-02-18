/**
 * Lista de citas del paciente: tabla (desktop) y cards (móvil).
 * Fecha con slice(0,4) para el año (evita 20260). Mostrador con ? : null (evita "0" → "AMO").
 */
import type { CitaPacienteCompleta } from "../citasApi";
import { Check, Eye, X } from "lucide-react";

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
											className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
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
				{citas.map((cita) => {
					const estadoPago = cita.estado_pago ?? cita.pago_estado_pago ?? 0;
					return (
						<div
							key={cita.id_cita}
							className="rounded-2xl border border-brand-200 bg-paper px-4 py-3 shadow-sm"
						>
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0 flex-1">
									<p className="text-sm font-semibold text-brand-900">{cita.eco_nombre}</p>
									<p className="mt-0.5 text-xs text-brand-700">
										{formatFecha(cita.fecha_cita)} · {formatHora(cita.hora_cita)}{" "}
										{cita.es_vinculada_mostrador ? (
											<span className="ml-1.5 rounded bg-brand-200 px-1.5 py-0.5 text-[10px] font-medium text-brand-800">Mostrador</span>
										) : null}
									</p>
									<p className="mt-0.5 text-xs text-brand-600">
										{cita.especialista_nombre} {cita.especialista_apellido}
									</p>
									<p className="mt-0.5 text-xs text-brand-600">
										Representado: {cita.id_representado ? "Sí" : "No"}
									</p>
								</div>
								<div className="flex flex-col items-end gap-2">
									<span
										className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium shrink-0 ${
											estadoPago === 0 ? "bg-amber-400/90 text-brand-900" : estadoPago === 1 ? "bg-emerald-600 text-paper" : "bg-red-500 text-paper"
										}`}
									>
										{getEstadoPagoLabel(estadoPago)}
									</span>
									<button
										type="button"
										onClick={() => onVerCita(cita)}
										className="inline-flex items-center gap-1 rounded-full border border-brand-600 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-100"
									>
										<Eye className="h-3.5 w-3.5" />
										Ver cita
									</button>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
