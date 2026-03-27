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

	// Form state for new representado
	const [formNombre, setFormNombre] = useState("");
	const [formApellido, setFormApellido] = useState("");
	const [formCedula, setFormCedula] = useState("");
	const [formFechaNacimiento, setFormFechaNacimiento] = useState("");
	const [formGenero, setFormGenero] = useState("");
	const [formParentesco, setFormParentesco] = useState("");
	const [formError, setFormError] = useState("");

	const canContinue =
		selectionType === "yo" ||
		(selectionType === "representado" && selectedRepresentadoId != null);

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
		try {
			const result = await createRepresentado({
				nombre: formNombre.trim(),
				apellido: formApellido.trim(),
				cedula: formCedula || null,
				fecha_nacimiento: formFechaNacimiento,
				genero: formGenero as "Masculino" | "Femenino",
				parentesco: formParentesco || null,
			}).unwrap();
			// Auto-select the newly created representado
			setSelectedRepresentadoId(result.id_representado);
			setShowForm(false);
			// Reset form
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
			{/* Header */}
			<div className="mb-8 text-center lg:mb-10">
				<h2 className="font-headline text-2xl font-extrabold text-brand-900 tracking-tight mb-2 sm:text-3xl lg:text-4xl">
					¿Para quién es la cita?
				</h2>
				<p className="text-brand-600 text-sm sm:text-base">
					Selecciona el perfil del paciente para continuar con el agendamiento.
				</p>
			</div>

			{/* Selection Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 lg:gap-8 lg:mb-12">
				{/* Option: Para Mí */}
				<button
					type="button"
					onClick={handleSelectYo}
					className={`group relative flex flex-col items-center p-6 rounded-3xl border-2 transition-all duration-300 shadow-lg text-center lg:p-8 lg:rounded-[2rem] ${
						selectionType === "yo"
							? "bg-brand-800 text-white border-brand-800 shadow-brand-800/20"
							: "bg-paper border-transparent hover:border-brand-200 shadow-brand-800/5 hover:shadow-xl"
					}`}
				>
					{selectionType === "yo" && (
						<div className="absolute top-4 right-4 lg:top-6 lg:right-6">
							<div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
								<Check className="h-3.5 w-3.5 text-brand-800" strokeWidth={3} />
							</div>
						</div>
					)}
					<div
						className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ring-4 transition-all lg:w-24 lg:h-24 lg:rounded-3xl lg:mb-6 ${
							selectionType === "yo"
								? "bg-white/20 ring-white/10"
								: "bg-brand-100 ring-cloud group-hover:ring-brand-200"
						}`}
					>
						<UserCircle
							className={`h-10 w-10 lg:h-12 lg:w-12 ${
								selectionType === "yo" ? "text-white" : "text-brand-600"
							}`}
						/>
					</div>
					<h3 className="font-headline text-lg font-bold mb-1 lg:text-xl">Para mí</h3>
					<p
						className={`text-sm font-medium ${
							selectionType === "yo" ? "text-white/80" : "text-brand-600"
						}`}
					>
						{userName}
					</p>
				</button>

				{/* Option: Para un Familiar */}
				<button
					type="button"
					onClick={handleSelectFamiliar}
					className={`group relative flex flex-col items-center p-6 rounded-3xl border-2 transition-all duration-300 shadow-lg text-center lg:p-8 lg:rounded-[2rem] ${
						selectionType === "representado"
							? "bg-brand-800 text-white border-brand-800 shadow-brand-800/20"
							: "bg-paper border-transparent hover:border-brand-200 shadow-brand-800/5 hover:shadow-xl"
					}`}
				>
					{selectionType === "representado" && (
						<div className="absolute top-4 right-4 lg:top-6 lg:right-6">
							<div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
								<Check className="h-3.5 w-3.5 text-brand-800" strokeWidth={3} />
							</div>
						</div>
					)}
					<div
						className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ring-4 transition-all lg:w-24 lg:h-24 lg:rounded-3xl lg:mb-6 ${
							selectionType === "representado"
								? "bg-white/20 ring-white/10"
								: "bg-brand-100 ring-cloud group-hover:ring-brand-200"
						}`}
					>
						<UserPlus
							className={`h-10 w-10 lg:h-12 lg:w-12 ${
								selectionType === "representado" ? "text-white" : "text-brand-600"
							}`}
						/>
					</div>
					<h3 className="font-headline text-lg font-bold mb-1 lg:text-xl">Para un familiar</h3>
					<p
						className={`text-sm font-medium ${
							selectionType === "representado" ? "text-white/80" : "text-brand-600"
						}`}
					>
						Seleccionar representado
					</p>
					<p
						className={`text-xs mt-1 ${
							selectionType === "representado" ? "text-white/60" : "text-slate-400"
						}`}
					>
						Hijos, pareja, padres o allegados
					</p>
				</button>
			</div>

			{/* Representados List + Form (only when "Para un familiar" is selected) */}
			{selectionType === "representado" && (
				<div className="bg-cloud/30 rounded-3xl p-6 mb-8 border border-brand-200/30 lg:rounded-[2rem] lg:p-10 lg:mb-12">
					<div className="flex items-center gap-3 mb-6 lg:gap-4 lg:mb-8">
						<div className="w-1.5 h-8 bg-brand-800 rounded-full" />
						<h4 className="font-headline text-lg font-bold text-brand-900 lg:text-xl">
							{showForm ? "Registrar nuevo familiar" : "Selecciona un representado"}
						</h4>
					</div>

					{!showForm ? (
						<>
							{/* Existing representados */}
							{representados.length > 0 ? (
								<div className="space-y-3 mb-6">
									{representados.map((rep) => (
										<button
											key={rep.id_representado}
											type="button"
											onClick={() => handleSelectRepresentado(rep)}
											className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${
												selectedRepresentadoId === rep.id_representado
													? "bg-brand-800 text-white shadow-lg shadow-brand-800/20"
													: "bg-paper hover:shadow-md shadow-sm"
											}`}
										>
											<div className="flex items-center gap-4 min-w-0">
												{selectedRepresentadoId === rep.id_representado ? (
													<div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
														<Check className="h-5 w-5" strokeWidth={3} />
													</div>
												) : (
													<InitialAvatar nombre={rep.nombre} apellido={rep.apellido} />
												)}
												<div className="text-left min-w-0">
													<p
														className={`font-bold text-sm truncate ${
															selectedRepresentadoId === rep.id_representado
																? "text-white"
																: "text-brand-900"
														}`}
													>
														{rep.nombre} {rep.apellido}
													</p>
													<p
														className={`text-xs font-medium uppercase tracking-wider truncate ${
															selectedRepresentadoId === rep.id_representado
																? "text-white/60"
																: "text-brand-600"
														}`}
													>
														{rep.parentesco ?? "Familiar"}
													</p>
												</div>
											</div>
											<ChevronRight
												className={`h-4 w-4 shrink-0 ${
													selectedRepresentadoId === rep.id_representado
														? "text-white/60"
														: "text-slate-400"
												}`}
											/>
										</button>
									))}
								</div>
							) : (
								<div className="text-center py-6 text-brand-600 text-sm mb-6">
									No tienes representados registrados aún.
								</div>
							)}

							{/* Add new button */}
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
							{/* New representado form */}
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5 lg:gap-x-8 lg:gap-y-6">
								{/* Nombre */}
								<div className="space-y-1.5">
									<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
										Nombre <span className="text-red-400">*</span>
									</label>
									<input
										type="text"
										value={formNombre}
										onChange={(e) => setFormNombre(e.target.value)}
										className="w-full bg-paper border border-brand-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand-800/20 focus:border-brand-500 text-sm font-medium outline-none transition-all"
										placeholder="Ej: Maria"
									/>
								</div>
								{/* Apellido */}
								<div className="space-y-1.5">
									<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
										Apellido <span className="text-red-400">*</span>
									</label>
									<input
										type="text"
										value={formApellido}
										onChange={(e) => setFormApellido(e.target.value)}
										className="w-full bg-paper border border-brand-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand-800/20 focus:border-brand-500 text-sm font-medium outline-none transition-all"
										placeholder="Ej: González"
									/>
								</div>
								{/* Cédula */}
								<div className="space-y-1.5">
									<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
										Cédula
									</label>
									<CedulaField
										value={formCedula}
										onChange={(tipo: TipoCedula, numero: string) =>
											setFormCedula(numero ? `${tipo}${numero}` : "")
										}
										inputClassName="!bg-paper !border-brand-200 !rounded-xl !py-3 !px-4"
										selectClassName="!bg-paper !border-brand-200 !rounded-xl !py-3"
									/>
								</div>
								{/* Fecha de Nacimiento */}
								<div className="space-y-1.5">
									<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
										Fecha de Nacimiento <span className="text-red-400">*</span>
									</label>
									<input
										type="date"
										value={formFechaNacimiento}
										onChange={(e) => setFormFechaNacimiento(e.target.value)}
										className="w-full bg-paper border border-brand-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand-800/20 focus:border-brand-500 text-sm font-medium outline-none transition-all"
									/>
								</div>
								{/* Género */}
								<div className="space-y-1.5">
									<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
										Género <span className="text-red-400">*</span>
									</label>
									<select
										value={formGenero}
										onChange={(e) => setFormGenero(e.target.value)}
										className="w-full bg-paper border border-brand-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand-800/20 focus:border-brand-500 text-sm font-medium outline-none transition-all"
									>
										<option value="">Seleccionar...</option>
										<option value="Femenino">Femenino</option>
										<option value="Masculino">Masculino</option>
									</select>
								</div>
								{/* Parentesco */}
								<div className="space-y-1.5">
									<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
										Parentesco
									</label>
									<select
										value={formParentesco}
										onChange={(e) => setFormParentesco(e.target.value)}
										className="w-full bg-paper border border-brand-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand-800/20 focus:border-brand-500 text-sm font-medium outline-none transition-all"
									>
										<option value="">Seleccionar...</option>
										{parentescos.length > 0 ? (
											parentescos.map((p) => (
												<option key={p} value={p}>
													{p}
												</option>
											))
										) : (
											<>
												<option value="Hijo/a">Hijo/a</option>
												<option value="Padre/Madre">Padre/Madre</option>
												<option value="Cónyuge">Cónyuge</option>
												<option value="Otro">Otro</option>
											</>
										)}
									</select>
								</div>
							</div>

							{formError && (
								<p className="mt-4 text-sm text-red-600 font-medium">{formError}</p>
							)}

							<div className="flex gap-3 mt-6 lg:mt-8">
								<button
									type="button"
									onClick={() => {
										setShowForm(false);
										setFormError("");
									}}
									className="px-6 py-3 rounded-xl text-brand-600 font-semibold hover:bg-brand-100 transition-colors text-sm"
								>
									Cancelar
								</button>
								<button
									type="button"
									onClick={handleCreateRepresentado}
									disabled={creando}
									className="px-6 py-3 rounded-xl bg-brand-800 text-white font-bold hover:bg-brand-900 transition-colors text-sm flex items-center gap-2 disabled:opacity-60"
								>
									{creando ? (
										"Registrando..."
									) : (
										<>
											<PlusCircle className="h-4 w-4" />
											Registrar familiar
										</>
									)}
								</button>
							</div>
						</>
					)}
				</div>
			)}

			{/* Action Footer */}
			<div className="flex justify-between items-center mt-8 lg:mt-12">
				<button
					type="button"
					onClick={() => navigate("/dashboard")}
					className="flex items-center gap-2 text-slate-400 font-bold hover:text-brand-900 transition-colors px-4 py-3 rounded-xl text-sm lg:px-6"
				>
					<ArrowLeft className="h-4 w-4" />
					<span className="font-headline tracking-tight">Cancelar</span>
				</button>
				<button
					type="button"
					onClick={handleContinue}
					disabled={!canContinue}
					className="bg-gradient-to-br from-brand-900 to-brand-800 text-white px-8 py-3.5 rounded-2xl font-headline font-extrabold tracking-tight shadow-xl shadow-brand-800/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm lg:px-10 lg:py-4"
				>
					Continuar al Paso 2
					<ArrowRight className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
};

export default PasoParaQuien;
