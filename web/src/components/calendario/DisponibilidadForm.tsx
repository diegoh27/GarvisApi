import type { FormEvent } from "react";
import type { TimeOption } from "./types";

type DisponibilidadFormProps = {
	fecha: string;
	horaInicio: string;
	minFecha: string;
	timeOptions: TimeOption[];
	error: string | null;
	submitStatus: "idle" | "loading" | "done";
	onFechaChange: (value: string) => void;
	onHoraInicioChange: (value: string) => void;
	onSubmit: (event: FormEvent) => void;
};

const DisponibilidadForm = ({
	fecha,
	horaInicio,
	minFecha,
	timeOptions,
	error,
	submitStatus,
	onFechaChange,
	onHoraInicioChange,
	onSubmit,
}: DisponibilidadFormProps) => {
	return (
		<div className="rounded-2xl bg-paper p-4 shadow-sm">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-brand-900">
					Solicitar disponibilidad
				</h3>
				<span className="text-[10px] text-brand-800">60 min</span>
			</div>
			<form className="mt-3 space-y-3" onSubmit={onSubmit}>
				<div className="space-y-1 text-xs text-brand-800">
					<label className="font-semibold">Fecha</label>
					<input
						type="date"
						value={fecha}
						onChange={(event) => onFechaChange(event.target.value)}
						min={minFecha}
						className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
					/>
				</div>
				<div className="space-y-1 text-xs text-brand-800">
					<label className="font-semibold">Hora inicio</label>
					<select
						value={horaInicio}
						onChange={(event) => onHoraInicioChange(event.target.value)}
						className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
					>
						<option value="">Selecciona hora</option>
						{timeOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>
				{error ? (
					<p className="text-[11px] font-semibold text-brand-900">{error}</p>
				) : null}
				<button
					type="submit"
					disabled={submitStatus === "loading"}
					className="w-full rounded-full bg-brand-700 px-3 py-2 text-xs font-semibold text-paper disabled:opacity-60"
				>
					{submitStatus === "loading" ? "Enviando..." : "Enviar solicitud"}
				</button>
				{submitStatus === "done" ? (
					<p className="text-[11px] font-semibold text-brand-800">
						Solicitud enviada
					</p>
				) : null}
			</form>
		</div>
	);
};

export default DisponibilidadForm;
