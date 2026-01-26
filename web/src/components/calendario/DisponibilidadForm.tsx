import type { FormEvent } from "react";
import type { TimeOption } from "./types";
import { useGetEcosQuery, useGetEcosByEspecialistaQuery } from "../../features/ecos/ecosApi";
import { useAuth } from "../../shared";

type DisponibilidadFormProps = {
	fecha: string;
	horaInicio: string;
	idEco: string;
	minFecha: string;
	timeOptions: TimeOption[];
	error: string | null;
	submitStatus: "idle" | "loading" | "done";
	onFechaChange: (value: string) => void;
	onHoraInicioChange: (value: string) => void;
	onIdEcoChange: (value: string) => void;
	onSubmit: (event: FormEvent) => void;
	onCancel?: () => void;
};

const DisponibilidadForm = ({
	fecha,
	horaInicio,
	idEco,
	minFecha,
	timeOptions,
	error,
	submitStatus,
	onFechaChange,
	onHoraInicioChange,
	onIdEcoChange,
	onSubmit,
	onCancel,
}: DisponibilidadFormProps) => {
	const { user } = useAuth();
	const isEspecialista = user?.rol === "especialista";
	const idEspecialista = user?.id_usuario || "";

	// Si es especialista, obtener solo sus ecos asignados; si es admin/moderador, todos los ecos
	const { data: ecosEspecialista = [], isLoading: loadingEcosEspecialista } = 
		useGetEcosByEspecialistaQuery(idEspecialista, { skip: !isEspecialista || !idEspecialista });
	const { data: ecosTodos = [], isLoading: loadingEcosTodos } = 
		useGetEcosQuery(undefined, { skip: isEspecialista });

	// Usar los ecos correspondientes según el rol
	const ecos = isEspecialista ? ecosEspecialista : ecosTodos;
	const loadingEcos = isEspecialista ? loadingEcosEspecialista : loadingEcosTodos;

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
				<div className="space-y-1 text-xs text-brand-800">
					<label className="font-semibold">
						Tipo de eco <span className="text-red-500">*</span>
					</label>
					<select
						required
						value={idEco}
						onChange={(event) => onIdEcoChange(event.target.value)}
						disabled={loadingEcos}
						className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700 disabled:opacity-50"
					>
						<option value="">
							{loadingEcos ? "Cargando..." : "Selecciona un eco"}
						</option>
						{ecos
							.filter((eco) => eco.activo === 1)
							.map((eco) => (
								<option key={eco.id_eco} value={eco.id_eco}>
									{eco.nombre}
								</option>
							))}
					</select>
				</div>
				{error ? (
					<p className="text-[11px] font-semibold text-brand-900">{error}</p>
				) : null}
				<div className="flex gap-2">
					{onCancel && (
						<button
							type="button"
							onClick={onCancel}
							className="flex-1 rounded-full border border-brand-300 bg-paper px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
						>
							Cancelar
						</button>
					)}
					<button
						type="submit"
						disabled={submitStatus === "loading"}
						className={`rounded-full bg-brand-700 px-3 py-2 text-xs font-semibold text-paper disabled:opacity-60 ${
							onCancel ? "flex-1" : "w-full"
						}`}
					>
						{submitStatus === "loading" ? "Enviando..." : "Enviar solicitud"}
					</button>
				</div>
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
