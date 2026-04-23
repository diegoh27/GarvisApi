import { useState } from "react";
import { X, User, Users, Search, UserPlus, CalendarPlus } from "lucide-react";
import type { Eco } from "../../ecos/ecosApi";
import type { DisponibilidadPublicaPorEcoItem } from "../disponibilidadApi";
import type { Representado } from "../../representados/representadosApi";
import { useGetRepresentadosQuery } from "../../representados/representadosApi";
import { CrearRepresentadoModal } from "../../representados/components";
import ReservarCitaParaMiForm from "./ReservarCitaParaMiForm";

type Step = "elegir" | "para_mi" | "para_representado" | "para_representado_form";

const LIMIT_REPRESENTADOS = 20;

type ReservarCitaElegirModalProps = {
	block: DisponibilidadPublicaPorEcoItem;
	eco: Eco;
	onClose: () => void;
	onSuccess?: () => void;
};

const ReservarCitaElegirModal = ({
	block,
	eco,
	onClose,
	onSuccess,
}: ReservarCitaElegirModalProps) => {
	const [step, setStep] = useState<Step>("elegir");
	const [searchRepresentado, setSearchRepresentado] = useState("");
	const [selectedRepresentado, setSelectedRepresentado] = useState<Representado | null>(null);
	const [isAddRepresentadoOpen, setIsAddRepresentadoOpen] = useState(false);

	const { data: representadosData, isLoading: loadingRepresentados } = useGetRepresentadosQuery({
		page: 1,
		limit: LIMIT_REPRESENTADOS,
		search: searchRepresentado.trim() || undefined,
	});

	const representados = representadosData?.data ?? [];
	const totalRepresentados = representadosData?.total ?? 0;
	const hasSearch = searchRepresentado.trim().length > 0;

	const handleSelectRepresentado = (r: Representado) => {
		setSelectedRepresentado(r);
		setStep("para_representado_form");
	};

	const handleBackFromForm = () => {
		setSelectedRepresentado(null);
		setStep("para_representado");
	};

	const title =
		step === "elegir"
			? "¿Para quién es la cita?"
			: step === "para_mi"
				? "Reservar cita para mí"
				: step === "para_representado"
					? "Reservar cita para representado"
					: selectedRepresentado
						? `Reservar cita para ${selectedRepresentado.nombre} ${selectedRepresentado.apellido}`
						: "Reservar cita para representado";

	return (
		<>
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
				<div className="relative flex w-full max-w-3xl max-h-[90vh] flex-col rounded-xl bg-paper shadow-lg">
					<div className="flex items-center justify-between border-b border-mist p-4">
						<h2 className="text-lg font-semibold text-brand-900">{title}</h2>
						<button
							onClick={onClose}
							className="rounded-lg p-1 text-brand-800 hover:bg-cloud"
							aria-label="Cerrar"
						>
							<X className="h-5 w-5" />
						</button>
					</div>

					{step === "elegir" && (
						<div className="flex-1 overflow-y-auto p-6">
							<p className="mb-6 text-base text-brand-600">
								Elija si la cita es para usted o para una persona que representa (hijo, familiar, etc.).
							</p>
							<div className="grid gap-4 sm:grid-cols-2">
								<button
									type="button"
									onClick={() => setStep("para_mi")}
									className="flex flex-col items-center gap-3 rounded-xl border-2 border-brand-200 bg-paper p-6 text-center transition-colors hover:border-brand-500 hover:bg-cloud/30 focus:outline-none focus:ring-2 focus:ring-brand-500"
								>
									<div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
										<User className="h-7 w-7" />
									</div>
									<span className="font-semibold text-brand-900">Para mí</span>
									<span className="text-base text-brand-600">
										Reservar la cita a mi nombre
									</span>
								</button>
								<button
									type="button"
									onClick={() => setStep("para_representado")}
									className="flex flex-col items-center gap-3 rounded-xl border-2 border-brand-200 bg-paper p-6 text-center transition-colors hover:border-brand-500 hover:bg-cloud/30 focus:outline-none focus:ring-2 focus:ring-brand-500"
								>
									<div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
										<Users className="h-7 w-7" />
									</div>
									<span className="font-semibold text-brand-900">Para un representado</span>
									<span className="text-base text-brand-600">
										Reservar la cita para otra persona
									</span>
								</button>
							</div>
						</div>
					)}

					{step === "para_mi" && (
						<ReservarCitaParaMiForm
							block={block}
							eco={eco}
							onClose={onClose}
							onSuccess={onSuccess}
							onBack={() => setStep("elegir")}
						/>
					)}

					{step === "para_representado" && (
						<div className="flex flex-1 flex-col overflow-hidden">
							<div className="border-b border-brand-200 p-4 space-y-3">
								<div className="relative">
									<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
									<input
										type="search"
										value={searchRepresentado}
										onChange={(e) => setSearchRepresentado(e.target.value)}
										placeholder="Buscar por nombre o cédula..."
										className="w-full rounded-lg border border-brand-300 bg-paper py-2 pl-9 pr-3 text-base text-brand-900 placeholder:text-brand-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
									/>
								</div>
								<button
									type="button"
									onClick={() => setIsAddRepresentadoOpen(true)}
									className="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-paper px-4 py-2 text-base font-medium text-brand-800 hover:bg-cloud"
								>
									<UserPlus className="h-4 w-4" />
									Agregar representado
								</button>
							</div>
							<div className="flex-1 overflow-y-auto p-4">
								{loadingRepresentados ? (
									<p className="text-center text-base text-brand-600">Cargando representados...</p>
								) : representados.length === 0 ? (
									<div className="rounded-lg border border-brand-200 bg-brand-50 p-6 text-center">
										<p className="text-brand-700">
											{hasSearch
												? "No hay representados que coincidan con la búsqueda."
												: "No tiene representados."}
										</p>
										{!hasSearch && (
											<p className="mt-2 text-base text-brand-600">
												Use el botón &quot;Agregar representado&quot; para registrar a una persona (hijo, familiar, etc.) y poder reservar citas a su nombre.
											</p>
										)}
										<button
											type="button"
											onClick={() => setStep("elegir")}
											className="mt-4 rounded-lg border border-brand-300 bg-paper px-4 py-2 text-base font-medium text-brand-800 hover:bg-cloud"
										>
											← Volver
										</button>
									</div>
								) : (
									<ul className="space-y-2">
										{representados.map((r) => (
											<li
												key={r.id_representado}
												className="flex items-center justify-between gap-4 rounded-lg border border-brand-200 bg-paper p-3 hover:border-brand-300"
											>
												<div>
													<p className="font-medium text-brand-900">
														{r.nombre} {r.apellido}
													</p>
													<p className="text-base text-brand-600">
														Cédula: {r.cedula}
														{r.parentesco ? ` • ${r.parentesco}` : ""}
													</p>
												</div>
												<button
													type="button"
													onClick={() => handleSelectRepresentado(r)}
													className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-base font-medium text-paper hover:bg-brand-800"
												>
													<CalendarPlus className="h-4 w-4" />
													Reservar para este
												</button>
											</li>
										))}
									</ul>
								)}
								{totalRepresentados > LIMIT_REPRESENTADOS && (
									<p className="mt-3 text-center text-sm text-brand-500">
										Mostrando los primeros {LIMIT_REPRESENTADOS} de {totalRepresentados}. Use la búsqueda para filtrar.
									</p>
								)}
							</div>
							<div className="border-t border-brand-200 p-4">
								<button
									type="button"
									onClick={() => setStep("elegir")}
									className="rounded-lg border border-brand-300 bg-paper px-4 py-2 text-base font-medium text-brand-800 hover:bg-cloud"
								>
									← Volver
								</button>
							</div>
						</div>
					)}

					{step === "para_representado_form" && selectedRepresentado && (
						<ReservarCitaParaMiForm
							block={block}
							eco={eco}
							representado={selectedRepresentado}
							onClose={onClose}
							onSuccess={onSuccess}
							onBack={handleBackFromForm}
						/>
					)}
				</div>
			</div>

			{isAddRepresentadoOpen && (
				<CrearRepresentadoModal
					onClose={() => setIsAddRepresentadoOpen(false)}
					onSuccess={() => setIsAddRepresentadoOpen(false)}
				/>
			)}
		</>
	);
};

export default ReservarCitaElegirModal;
