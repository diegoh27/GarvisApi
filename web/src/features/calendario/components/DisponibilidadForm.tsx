import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { TimeOption } from "../types";
import { useGetEcosQuery, useGetEcosByEspecialistaQuery } from "../../ecos/ecosApi";
import { useAuth } from "../../../shared";

type DisponibilidadFormProps = {
	fecha: string;
	horaInicio: string;
	idEcos: string[];
	minFecha: string;
	timeOptions: TimeOption[];
	selectedCellsCount?: number;
	onClearSelection?: () => void;
	error: string | null;
	submitStatus: "idle" | "loading" | "done";
	onFechaChange: (value: string) => void;
	onHoraInicioChange: (value: string) => void;
	onIdEcosChange: (value: string[]) => void;
	onSubmit: (event: FormEvent) => void;
	onCancel?: () => void;
};

const DisponibilidadForm = ({
	fecha,
	horaInicio,
	idEcos,
	minFecha,
	timeOptions,
	selectedCellsCount = 0,
	onClearSelection,
	error,
	submitStatus,
	onFechaChange,
	onHoraInicioChange,
	onIdEcosChange,
	onSubmit,
	onCancel,
}: DisponibilidadFormProps) => {
	const useCalendarSelection = selectedCellsCount > 0;
	const { user } = useAuth();
	const isEspecialista = user?.rol === "especialista";
	const idEspecialista = user?.id_usuario || "";

	const { data: ecosEspecialista = [], isLoading: loadingEcosEspecialista } =
		useGetEcosByEspecialistaQuery(idEspecialista, { skip: !isEspecialista || !idEspecialista });
	const { data: ecosTodos = [], isLoading: loadingEcosTodos } =
		useGetEcosQuery(undefined, { skip: isEspecialista });

	const ecos = isEspecialista ? ecosEspecialista : ecosTodos;
	const loadingEcos = isEspecialista ? loadingEcosEspecialista : loadingEcosTodos;

	const [isEcosDropdownOpen, setIsEcosDropdownOpen] = useState(false);
	const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">("bottom");
	const ecosDropdownRef = useRef<HTMLDivElement | null>(null);
	const ecosButtonRef = useRef<HTMLButtonElement | null>(null);

	const toggleEco = (idEco: string) => {
		const isSelected = idEcos.includes(idEco);
		if (isSelected) {
			onIdEcosChange(idEcos.filter((id) => id !== idEco));
		} else {
			onIdEcosChange([...idEcos, idEco]);
		}
	};

	const handleToggleDropdown = () => {
		if (!isEcosDropdownOpen && ecosButtonRef.current) {
			const rect = ecosButtonRef.current.getBoundingClientRect();
			const spaceBelow = window.innerHeight - rect.bottom;
			const spaceAbove = rect.top;
			const dropdownHeight = 240;

			if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
				setDropdownPosition("top");
			} else {
				setDropdownPosition("bottom");
			}
		}
		setIsEcosDropdownOpen((prev) => !prev);
	};

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				ecosDropdownRef.current &&
				!ecosDropdownRef.current.contains(event.target as Node)
			) {
				setIsEcosDropdownOpen(false);
			}
		};

		if (isEcosDropdownOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isEcosDropdownOpen]);

	return (
		<div className="rounded-2xl bg-paper p-4 shadow-sm">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-brand-900">
					Solicitar disponibilidad
				</h3>
				<span className="text-[10px] text-brand-800">Bloques de 20 minutos</span>
			</div>
			<form className="mt-3 space-y-3" onSubmit={onSubmit}>
				{useCalendarSelection ? (
					<div className="rounded-xl border border-brand-200 bg-brand-50/50 px-3 py-3 text-xs text-brand-800">
						<p className="font-semibold">
							{selectedCellsCount} celda{selectedCellsCount !== 1 ? "s" : ""} seleccionada{selectedCellsCount !== 1 ? "s" : ""} en el calendario
						</p>
						<p className="mt-1 text-[11px] text-brand-700">
							Haz clic en celdas vacías para sumar o quitar. Elige el tipo de eco y envía la solicitud.
						</p>
						{onClearSelection && (
							<button
								type="button"
								onClick={onClearSelection}
								className="mt-2 rounded-lg border border-brand-300 bg-paper px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
							>
								Limpiar selección
							</button>
						)}
					</div>
				) : (
					<>
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
					</>
				)}
				<div className="space-y-1 text-xs text-brand-800">
					<label className="font-semibold">
						Tipo de eco <span className="text-red-500">*</span>
					</label>
					<div className="relative" ref={ecosDropdownRef}>
						<button
							type="button"
							ref={ecosButtonRef}
							onClick={handleToggleDropdown}
							disabled={loadingEcos}
							className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-left text-xs outline-none focus:border-brand-500 disabled:opacity-50 flex items-center justify-between"
						>
							<span className="truncate">
								{loadingEcos
									? "Cargando ecos..."
									: idEcos.length === 0
										? "Selecciona los ecos"
										: idEcos.length === 1
											? "1 eco seleccionado"
											: `${idEcos.length} ecos seleccionados`}
							</span>
							<span className="ml-2 text-[10px] text-brand-600">
								{isEcosDropdownOpen ? "▲" : "▼"}
							</span>
						</button>
						{isEcosDropdownOpen && (
							<div
								className={`absolute z-50 w-full rounded-lg border border-brand-300 bg-paper shadow-lg max-h-60 overflow-auto ${dropdownPosition === "top" ? "bottom-full mb-1" : "top-full mt-1"
									}`}
							>
								{loadingEcos ? (
									<div className="p-3 text-xs text-brand-600">Cargando ecos...</div>
								) : ecos.filter((eco) => eco.activo === 1).length === 0 ? (
									<div className="p-3 text-xs text-brand-600">
										No hay ecos disponibles
									</div>
								) : (
									<div className="p-1">
										{ecos
											.filter((eco) => eco.activo === 1)
											.map((eco) => {
												const isSelected = idEcos.includes(eco.id_eco);
												return (
													<button
														key={eco.id_eco}
														type="button"
														onClick={() => toggleEco(eco.id_eco)}
														className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-brand-50 transition-colors ${isSelected ? "bg-brand-50" : ""
															}`}
													>
														<div
															className={`flex h-3 w-3 items-center justify-center rounded border ${isSelected
																? "border-brand-700 bg-brand-700"
																: "border-brand-300 bg-paper"
																}`}
														>
															{isSelected && (
																<span className="block h-2 w-2 rounded-sm bg-paper" />
															)}
														</div>
														<span className="flex-1 text-left">{eco.nombre}</span>
													</button>
												);
											})}
									</div>
								)}
							</div>
						)}
					</div>
					<p className="text-[10px] text-brand-700">
						{useCalendarSelection
							? "Selecciona uno o varios ecos para aplicar a todas las celdas."
							: "Puedes seleccionar uno o varios ecos desde el desplegable."}
					</p>
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
						className={`rounded-full bg-brand-700 px-3 py-2 text-xs font-semibold text-paper disabled:opacity-60 ${onCancel ? "flex-1" : "w-full"
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
