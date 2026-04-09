import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	UserPlus,
	UserCircle,
	ChevronRight,
	ArrowLeft,
	ArrowRight,
	Check,
	PlusCircle,
} from "lucide-react";
import { useAuth, CedulaField } from "../../../shared";
import type { TipoCedula } from "../../../shared";
import {
	useGetRepresentadosQuery,
	useGetParentescosQuery,
	useCreateRepresentadoMutation,
} from "../../representados/representadosApi";
import type { Representado } from "../../representados/representadosApi";

type PasoParaQuienProps = {
	onNext: (data: { tipo: "yo" | "representado"; id_representado?: string }) => void;
};

/** Initials avatar */
const InitialAvatar = ({ nombre, apellido, size = "w-12 h-12" }: { nombre: string; apellido: string; size?: string }) => {
	const initials = `${(nombre?.[0] ?? "").toUpperCase()}${(apellido?.[0] ?? "").toUpperCase()}`;
	return (
		<div className={`${size} rounded-2xl bg-brand-200 text-brand-800 flex items-center justify-center font-bold text-sm shrink-0`}>
			{initials || <UserCircle className="h-5 w-5" />}
		</div>
	);
};

/** Radio-style circle indicator for mobile selection */
const RadioCircle = ({ active }: { active: boolean }) => (
	<div
		className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${active ? "border-brand-800 bg-brand-800" : "border-slate-300"
			}`}
	>
		{active && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
	</div>
);

const PasoParaQuien = ({ onNext }: PasoParaQuienProps) => {
	const navigate = useNavigate();
	const { user } = useAuth();
	const { data: representadosData } = useGetRepresentadosQuery({ page: 1, limit: 50 });
	const { data: parentescosData } = useGetParentescosQuery();
	const [createRepresentado, { isLoading: creando }] = useCreateRepresentadoMutation();
	const representados = representadosData?.data ?? [];
	const parentescos = parentescosData ?? [];

	// Selection state
	const [selectionType, setSelectionType] = useState<"yo" | "representado" | null>(null);
	const [selectedRepresentadoId, setSelectedRepresentadoId] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);

	// Form state
	const [formNombre, setFormNombre] = useState("");
	const [formApellido, setFormApellido] = useState("");
	const [formCedula, setFormCedula] = useState("");
	const [formFechaNacimiento, setFormFechaNacimiento] = useState("");
	const [formGenero, setFormGenero] = useState("");
	const [formParentesco, setFormParentesco] = useState("");
	const [formError, setFormError] = useState("");
	const [errors, setErrors] = useState<Record<string, string>>({});

	const now = new Date();
	const todayStr = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, '0') + "-" + String(now.getDate()).padStart(2, '0');
	const minDateStr = (now.getFullYear() - 115) + "-" + String(now.getMonth() + 1).padStart(2, '0') + "-" + String(now.getDate()).padStart(2, '0');

	const canContinue =
		selectionType === "yo" ||
		(selectionType === "representado" && selectedRepresentadoId != null);

	const handleFocus = (field: string) => {
		setErrors((prev) => ({ ...prev, [field]: "" }));
		setFormError(""); // limpiar error general
	};

	const handleBlur = (field: string) => {
		let error = "";
		switch (field) {
			case "nombre":
				if (!formNombre.trim()) error = "El nombre es obligatorio.";
				break;
			case "apellido":
				if (!formApellido.trim()) error = "El apellido es obligatorio.";
				break;
			case "fecha_nacimiento":
				if (!formFechaNacimiento) {
					error = "La fecha de nacimiento es obligatoria.";
				} else if (formFechaNacimiento > todayStr) {
					error = "No puedes agregar una fecha futura";
				} else if (formFechaNacimiento < minDateStr) {
					error = "No puedes agregar personas de mas de 115 años";
				}
				break;
			case "cedula":
				if (formCedula) {
					const cedulaNumber = parseInt(formCedula.substring(1), 10);
					if (isNaN(cedulaNumber) || cedulaNumber < 100000 || cedulaNumber > 99999999) {
						error = "El número de cédula debe estar entre 100.000 y 99.999.999";
					}
				}
				break;
			case "genero":
				if (!formGenero) error = "El género es obligatorio.";
				break;
		}
		if (error) {
			setErrors((prev) => ({ ...prev, [field]: error }));
		}
	};

	const handleSelectYo = () => {
		setSelectionType("yo");
		setSelectedRepresentadoId(null);
		setShowForm(false);
	};

	const handleSelectFamiliar = () => {
		setSelectionType("representado");
	};

	const handleSelectRepresentado = (rep: Representado) => {
		setSelectedRepresentadoId(rep.id_representado);
		setShowForm(false);
	};

	const handleCreateRepresentado = async () => {
		setFormError("");
		if (!formNombre.trim() || !formApellido.trim() || !formFechaNacimiento || !formGenero) {
			setFormError("Por favor completa los campos obligatorios: nombre, apellido, fecha de nacimiento y género.");
			return;
		}

		let hasErrors = false;
		const newErrors: Record<string, string> = {};

		if (formFechaNacimiento > todayStr) {
			newErrors.fecha_nacimiento = "No puedes agregar una fecha futura";
			hasErrors = true;
		} else if (formFechaNacimiento < minDateStr) {
			newErrors.fecha_nacimiento = "No puedes agregar personas de mas de 115 años";
			hasErrors = true;
		}

		if (formCedula) {
			const cedulaNumber = parseInt(formCedula.substring(1), 10);
			if (isNaN(cedulaNumber) || cedulaNumber < 100000 || cedulaNumber > 99999999) {
				newErrors.cedula = "El número de cédula debe estar entre 100.000 y 99.999.999";
				hasErrors = true;
			}
		}

		if (hasErrors) {
			setErrors((prev) => ({ ...prev, ...newErrors }));
			return;
		}

		try {
			const result = await createRepresentado({
				nombre: formNombre.trim(),
				apellido: formApellido.trim(),
				cedula: formCedula || null,
				fecha_nacimiento: formFechaNacimiento,
				genero: formGenero as "Masculino" | "Femenino",
				parentesco: formParentesco || null,
			}).unwrap();
			setSelectedRepresentadoId(result.id_representado);
			setShowForm(false);
			setFormNombre("");
			setFormApellido("");
			setFormCedula("");
			setFormFechaNacimiento("");
			setFormGenero("");
			setFormParentesco("");
		} catch {
			setFormError("Error al registrar el familiar. Intente de nuevo.");
		}
	};

	const handleContinue = () => {
		if (!canContinue) return;
		if (selectionType === "yo") {
			onNext({ tipo: "yo" });
		} else if (selectionType === "representado" && selectedRepresentadoId) {
			onNext({ tipo: "representado", id_representado: selectedRepresentadoId });
		}
	};

	const userName = [user?.nombre, user?.apellido].filter(Boolean).join(" ") || "Paciente";

	return (
		<div>
			{/* ─── HEADER ─── */}
			<div className="mb-6 lg:mb-10 lg:text-center">
				<h2 className="font-headline text-2xl font-extrabold text-brand-900 tracking-tight mb-1 leading-tight sm:text-3xl lg:text-4xl lg:mb-2">
					¿Para quién es la cita?
				</h2>
				<p className="text-brand-600 text-sm lg:text-base">
					Selecciona si la cita es para ti u otra persona.
				</p>
			</div>

			{/* ─── SELECTION CARDS ─── */}
			<div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-8 mb-6 lg:mb-12">
				{/* Card: Para Mí */}
				<button
					type="button"
					onClick={handleSelectYo}
					className={`w-full text-left p-5 rounded-3xl border-2 transition-all duration-300 lg:flex lg:flex-col lg:items-center lg:text-center lg:p-8 lg:rounded-[2rem] ${selectionType === "yo"
						? "bg-brand-800 text-white border-brand-800 shadow-xl shadow-brand-800/20 lg:shadow-brand-800/20"
						: "bg-paper border-transparent shadow-lg shadow-brand-800/5 hover:border-brand-200 lg:hover:shadow-xl"
						}`}
				>
					{/* Mobile layout: icon + radio inline */}
					<div className="flex items-center justify-between mb-3 lg:hidden">
						<div
							className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectionType === "yo"
								? "bg-white/20 text-white"
								: "bg-brand-100 text-brand-600"
								}`}
						>
							<UserCircle className="h-7 w-7" />
						</div>
						<RadioCircle active={selectionType === "yo"} />
					</div>
					{/* Desktop layout: large centered icon */}
					<div className="hidden lg:block mb-6">
						{selectionType === "yo" && (
							<div className="absolute top-6 right-6">
								<div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
									<Check className="h-3.5 w-3.5 text-brand-800" strokeWidth={3} />
								</div>
							</div>
						)}
						<div
							className={`w-24 h-24 rounded-3xl flex items-center justify-center ring-4 transition-all ${selectionType === "yo"
								? "bg-white/20 ring-white/10"
								: "bg-brand-100 ring-cloud group-hover:ring-brand-200"
								}`}
						>
							<UserCircle className={`h-12 w-12 ${selectionType === "yo" ? "text-white" : "text-brand-600"}`} />
						</div>
					</div>
					{/* Text content */}
					<div>
						<h3 className="font-headline text-lg font-bold mb-0.5 lg:text-xl lg:mb-1">Para mí</h3>
						<p className={`text-sm font-semibold ${selectionType === "yo" ? "text-white/80" : "text-brand-600"}`}>
							{userName}
						</p>
					</div>
				</button>

				{/* Card: Para un Familiar */}
				<button
					type="button"
					onClick={handleSelectFamiliar}
					className={`w-full text-left p-5 rounded-3xl border-2 transition-all duration-300 lg:flex lg:flex-col lg:items-center lg:text-center lg:p-8 lg:rounded-[2rem] ${selectionType === "representado"
						? "bg-brand-800 text-white border-brand-800 shadow-xl shadow-brand-800/20"
						: "bg-paper border-transparent shadow-lg shadow-brand-800/5 hover:border-brand-200 lg:hover:shadow-xl"
						}`}
				>
					{/* Mobile layout: icon + radio inline */}
					<div className="flex items-center justify-between mb-3 lg:hidden">
						<div
							className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectionType === "representado"
								? "bg-white/20 text-white"
								: "bg-brand-100 text-brand-600"
								}`}
						>
							<UserPlus className="h-7 w-7" />
						</div>
						<RadioCircle active={selectionType === "representado"} />
					</div>
					{/* Desktop layout: large centered icon */}
					<div className="hidden lg:block mb-6 relative">
						{selectionType === "representado" && (
							<div className="absolute -top-2 -right-2">
								<div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
									<Check className="h-3.5 w-3.5 text-brand-800" strokeWidth={3} />
								</div>
							</div>
						)}
						<div
							className={`w-24 h-24 rounded-3xl flex items-center justify-center ring-4 transition-all ${selectionType === "representado"
								? "bg-white/20 ring-white/10"
								: "bg-brand-100 ring-cloud"
								}`}
						>
							<UserPlus className={`h-12 w-12 ${selectionType === "representado" ? "text-white" : "text-brand-600"}`} />
						</div>
					</div>
					{/* Text content */}
					<div>
						<h3 className="font-headline text-lg font-bold mb-0.5 lg:text-xl lg:mb-1">Para un familiar</h3>
						<p className={`text-sm ${selectionType === "representado" ? "text-white/70" : "text-brand-600"}`}>
							Registra los datos de tu representado.
						</p>
					</div>
				</button>
			</div>

			{/* ─── REPRESENTADOS PANEL (visible when "Para un familiar" is selected) ─── */}
			{selectionType === "representado" && (
				<div className="bg-paper/80 rounded-3xl p-5 mb-6 border border-brand-200/30 lg:rounded-[2rem] lg:p-10 lg:mb-12">
					<div className="flex items-center gap-3 mb-5 lg:gap-4 lg:mb-8">
						<div className="w-1.5 h-8 bg-brand-800 rounded-full" />
						<h4 className="font-headline text-base font-bold text-brand-900 lg:text-xl">
							{showForm ? "Registrar nuevo familiar" : "Selecciona un representado"}
						</h4>
					</div>

					{!showForm ? (
						<>
							{representados.length > 0 ? (
								<div className="space-y-3 mb-5">
									{representados.map((rep) => (
										<button
											key={rep.id_representado}
											type="button"
											onClick={() => handleSelectRepresentado(rep)}
											className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${selectedRepresentadoId === rep.id_representado
												? "bg-brand-800 text-white shadow-lg shadow-brand-800/20"
												: "bg-paper hover:shadow-md shadow-sm"
												}`}
										>
											<div className="flex items-center gap-3 lg:gap-4 min-w-0">
												{selectedRepresentadoId === rep.id_representado ? (
													<div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
														<Check className="h-5 w-5" strokeWidth={3} />
													</div>
												) : (
													<InitialAvatar nombre={rep.nombre} apellido={rep.apellido} size="w-10 h-10 lg:w-12 lg:h-12" />
												)}
												<div className="text-left min-w-0">
													<p className={`font-bold text-sm truncate ${selectedRepresentadoId === rep.id_representado ? "text-white" : "text-brand-900"}`}>
														{rep.nombre} {rep.apellido}
													</p>
													<p className={`text-xs font-medium uppercase tracking-wider truncate ${selectedRepresentadoId === rep.id_representado ? "text-white/60" : "text-brand-600"}`}>
														{rep.parentesco ?? "Familiar"}
													</p>
												</div>
											</div>
											<ChevronRight className={`h-4 w-4 shrink-0 ${selectedRepresentadoId === rep.id_representado ? "text-white/60" : "text-slate-400"}`} />
										</button>
									))}
								</div>
							) : (
								<div className="text-center py-4 text-brand-600 text-sm mb-5 lg:py-6 lg:mb-6">
									No tienes representados registrados aún.
								</div>
							)}
							<button
								type="button"
								onClick={() => setShowForm(true)}
								className="w-full py-3 border-2 border-dashed border-brand-300 rounded-2xl text-brand-600 font-bold text-sm hover:border-brand-800 hover:text-brand-800 transition-all flex items-center justify-center gap-2 lg:py-4"
							>
								<PlusCircle className="h-5 w-5" />
								Registrar nuevo familiar
							</button>
						</>
					) : (
						<>
							{/* ─── NEW FAMILY MEMBER FORM ─── */}
							<div className="space-y-4 lg:grid lg:grid-cols-3 lg:gap-x-8 lg:gap-y-6 lg:space-y-0 pr-6">
								{/* Nombre + Apellido (side by side on mobile too) */}
								<div className="flex gap-3 lg:contents">
									<div className="flex-1 space-y-1.5">
										<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">
											Nombre <span className="text-red-400">*</span>
										</label>
										<div className="relative">
											<div className="absolute left-0 top-0 w-1 h-full bg-brand-800 rounded-l-sm" />
											<input
												type="text"
												value={formNombre}
												onChange={(e) => setFormNombre(e.target.value)}
												onBlur={() => handleBlur("nombre")}
												onFocus={() => handleFocus("nombre")}
												className="w-full bg-paper border-b border-brand-400 rounded-sm py-3 pl-4 pr-3 text-sm font-medium focus:ring-0 placeholder:text-slate-400"
												placeholder="Ej: Maria"
											/>
										</div>
										{errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
									</div>
									<div className="flex-1 space-y-1.5">
										<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">
											Apellido <span className="text-red-400">*</span>
										</label>
										<div className="relative">
											<div className="absolute left-0 top-0 w-1 h-full bg-brand-800 rounded-l-sm" />
											<input
												type="text"
												value={formApellido}
												onChange={(e) => setFormApellido(e.target.value)}
												onBlur={() => handleBlur("apellido")}
												onFocus={() => handleFocus("apellido")}
												className="w-full bg-paper border-b border-brand-400 rounded-sm py-3 pl-4 pr-3 text-sm font-medium focus:ring-0 placeholder:text-slate-400"
												placeholder="Ej: González"
											/>
										</div>
										{errors.apellido && <p className="text-xs text-red-500 mt-1">{errors.apellido}</p>}
									</div>
								</div>

								{/* Cédula */}
								<div 
									className="space-y-1.5"
									onBlurCapture={() => handleBlur("cedula")}
									onFocusCapture={() => handleFocus("cedula")}
								>
									<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">
										Cédula
									</label>
									<CedulaField
										value={formCedula}
										onChange={(tipo: TipoCedula, numero: string) =>
											setFormCedula(numero ? `${tipo}${numero}` : "")
										}
										inputClassName="!bg-paper !border-b border-brand-200 !rounded-sm !py-3 !px-4"
										selectClassName="!bg-paper !border-b border-brand-200 !rounded-sm !py-3"
									/>
									{errors.cedula && <p className="text-xs text-red-500 mt-1">{errors.cedula}</p>}
								</div>

								{/* Fecha + Parentesco (side by side on mobile too) */}
								<div className="flex gap-3 lg:contents">
									<div className="flex-1 space-y-1.5">
										<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">
											Fecha de nacimiento <span className="text-red-400">*</span>
										</label>
										<div className="relative">
											<div className="absolute left-0 top-0 w-1 h-full bg-brand-800 rounded-l-sm" />
											<input
												type="date"
												value={formFechaNacimiento}
												min={minDateStr}
												max={todayStr}
												onChange={(e) => setFormFechaNacimiento(e.target.value)}
												onBlur={() => handleBlur("fecha_nacimiento")}
												onFocus={() => handleFocus("fecha_nacimiento")}
												className="w-full bg-paper border-b border-brand-400 rounded-sm py-3 pl-4 pr-3 text-sm font-medium focus:ring-0 text-brand-600"
											/>
										</div>
										{errors.fecha_nacimiento && <p className="text-xs text-red-500 mt-1">{errors.fecha_nacimiento}</p>}
									</div>
									<div className="flex-1 space-y-1.5">
										<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">
											Parentesco
										</label>
										<div className="relative">
											<div className="absolute left-0 top-0 w-1 h-full bg-brand-800 rounded-l-sm" />
											<input
												type="text"
												value={formParentesco}
												onChange={(e) => setFormParentesco(e.target.value)}
												onBlur={() => handleBlur("parentesco")}
												onFocus={() => handleFocus("parentesco")}
												className="w-full bg-paper border-b border-brand-400 rounded-sm py-3 pl-4 pr-3 text-sm font-medium focus:ring-0 placeholder:text-slate-400"
												placeholder="Ej: Hijo/a"
											/>
										</div>
										{errors.parentesco && <p className="text-xs text-red-500 mt-1">{errors.parentesco}</p>}
									</div>
								</div>

								{/* Género — toggle buttons on mobile, select on desktop */}
								<div className="space-y-1.5">
									<label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">
										Género <span className="text-red-400">*</span>
									</label>
									{/* Mobile: toggle buttons */}
									<div className="flex gap-3 lg:hidden">
										<button
											type="button"
											onClick={() => setFormGenero("Masculino")}
											className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-colors ${formGenero === "Masculino"
												? "border-brand-800 bg-brand-800 text-white"
												: "border-transparent bg-paper text-brand-900 hover:border-brand-300"
												}`}
										>
											Masculino
										</button>
										<button
											type="button"
											onClick={() => setFormGenero("Femenino")}
											className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-colors ${formGenero === "Femenino"
												? "border-brand-800 bg-brand-800 text-white"
												: "border-transparent bg-paper text-brand-900 hover:border-brand-300"
												}`}
										>
											Femenino
										</button>
									</div>
									{/* Desktop: select */}
									<select
										value={formGenero}
										onChange={(e) => setFormGenero(e.target.value)}
										className="hidden lg:block w-full bg-paper border border-brand-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand-800/20 focus:border-brand-500 text-sm font-medium outline-none transition-all"
									>
										<option value="">Seleccionar...</option>
										<option value="Femenino">Femenino</option>
										<option value="Masculino">Masculino</option>
									</select>
								</div>
							</div>

							{formError && (
								<p className="mt-3 text-sm text-red-600 font-medium lg:mt-4">{formError}</p>
							)}

							<div className="flex gap-3 mt-5 lg:mt-8">
								<button
									type="button"
									onClick={() => { setShowForm(false); setFormError(""); }}
									className="px-5 py-2.5 rounded-xl text-brand-600 font-semibold hover:bg-brand-100 transition-colors text-sm lg:px-6 lg:py-3"
								>
									Cancelar
								</button>
								<button
									type="button"
									onClick={handleCreateRepresentado}
									disabled={creando}
									className="px-5 py-2.5 rounded-xl bg-brand-800 text-white font-bold hover:bg-brand-900 transition-colors text-sm flex items-center gap-2 disabled:opacity-60 lg:px-6 lg:py-3"
								>
									{creando ? "Registrando..." : (
										<><PlusCircle className="h-4 w-4" /> Registrar familiar</>
									)}
								</button>
							</div>
						</>
					)}
				</div>
			)}

			{/* ─── ACTION FOOTER ─── */}
			{/* Mobile: full-width stacked buttons */}
			<div className="mt-8 lg:hidden">
				<button
					type="button"
					onClick={handleContinue}
					disabled={!canContinue}
					className="w-full bg-gradient-to-br from-brand-900 to-brand-800 text-white py-4 rounded-3xl font-headline font-bold text-lg shadow-xl shadow-brand-800/20 active:scale-95 transition-transform duration-200 disabled:opacity-40 disabled:active:scale-100"
				>
					Continuar a Especialidad
				</button>
				<button
					type="button"
					onClick={() => navigate("/dashboard")}
					className="w-full mt-3 py-3 text-brand-800 font-semibold text-sm hover:bg-cloud rounded-xl transition-colors"
				>
					Cancelar solicitud
				</button>
			</div>

			{/* Desktop: inline left-right */}
			<div className="hidden lg:flex justify-between items-center mt-12 pb-10">
				<button
					type="button"
					onClick={() => navigate("/dashboard")}
					className="flex items-center gap-2 text-slate-400 font-bold hover:text-brand-900 transition-colors px-6 py-3 rounded-xl text-sm"
				>
					<ArrowLeft className="h-4 w-4" />
					<span className="font-headline tracking-tight">Cancelar</span>
				</button>
				<button
					type="button"
					onClick={handleContinue}
					disabled={!canContinue}
					className="bg-gradient-to-br from-brand-900 to-brand-800 text-white px-10 py-4 rounded-2xl font-headline font-extrabold tracking-tight shadow-xl shadow-brand-800/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm"
				>
					Continuar
					<ArrowRight className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
};

export default PasoParaQuien;
