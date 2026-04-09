import { useEffect, useState } from "react";
import { PageShell } from "../../../shared";
import { ShieldCheck, Save } from "lucide-react";
import {
	useGetPermisosMenuModeradorQuery,
	useUpdatePermisosMenuModeradorMutation,
	type PermisosMenuModerador,
	defaultPermisosMenuModerador,
} from "../../roles/rolesApi";
import { MODERADOR_MENU_MODULES } from "../../roles/moderadorMenuModules";

const ModeradoresPage = () => {
	const { data: permisos, isLoading } = useGetPermisosMenuModeradorQuery();
	const [updatePermisos, { isLoading: isSaving }] =
		useUpdatePermisosMenuModeradorMutation();
	const [local, setLocal] = useState<PermisosMenuModerador>(defaultPermisosMenuModerador);
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		if (permisos) setLocal({ ...defaultPermisosMenuModerador(), ...permisos });
	}, [permisos]);

	const handleToggle = (key: keyof PermisosMenuModerador) => {
		setLocal((prev) => ({ ...prev, [key]: !prev[key] }));
		setSaved(false);
	};

	const handleGuardar = async () => {
		try {
			await updatePermisos(local).unwrap();
			setSaved(true);
			setTimeout(() => setSaved(false), 3000);
		} catch {
			// error manejado por la API
		}
	};

	return (
		<PageShell
			title="Permisos de Moderadores"
			description="Administra el nivel de acceso y la visibilidad de los módulos del sistema para el rol de Moderador."
		>
			<div className="mx-auto max-w-6xl space-y-6 rounded-2xl bg-slate-50 p-4 sm:p-6">
				<section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
					<div className="mb-6 flex items-start gap-4 border-b border-slate-100 pb-5">
						<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-[#006965]">
							<ShieldCheck className="h-6 w-6" />
						</div>
						<div>
							<h2 className="text-xl font-bold text-slate-900">
								Visibilidad de módulos en el menú lateral
							</h2>
							<p className="mt-1 text-sm text-slate-600">
								Activa o desactiva qué secciones pueden ver los moderadores en la barra lateral. El
								inicio (Home) siempre permanece visible para ellos.
							</p>
						</div>
					</div>

					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-100 border-t-[#006965]" />
						</div>
					) : (
						<>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
								{MODERADOR_MENU_MODULES.map(({ key, label, icon: Icon, description }) => {
									const isActive = Boolean(local[key]);
									return (
										<div
											key={key}
											className={`group relative flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
												isActive
													? "border-[#006965]/40 bg-teal-50/30"
													: "border-slate-200 hover:border-slate-300"
											}`}
										>
											<div className="flex items-start justify-between gap-3">
												<div
													className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
														isActive
															? "bg-[#006965] text-white shadow-sm"
															: "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
													}`}
												>
													<Icon className="h-5 w-5" />
												</div>
												<button
													type="button"
													onClick={() => handleToggle(key)}
													className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#006965] focus:ring-offset-2 ${
														isActive
															? "border-2 border-[#006965] bg-[#006965]"
															: "border-2 border-slate-300 bg-slate-100"
													}`}
													role="switch"
													aria-checked={isActive}
													aria-label={`Permiso ${label}`}
												>
													<span
														aria-hidden="true"
														className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
															isActive ? "translate-x-5" : "translate-x-0.5"
														}`}
													/>
												</button>
											</div>
											<div>
												<h3
													className={`font-semibold ${isActive ? "text-slate-900" : "text-slate-700"}`}
												>
													{label}
												</h3>
												<p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
											</div>
										</div>
									);
								})}
							</div>

							<div className="sticky bottom-0 z-10 mt-8 rounded-xl border border-slate-200 bg-slate-50/95 px-4 py-4 backdrop-blur sm:px-6">
								<div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
									{saved ? (
										<div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-800">
											<ShieldCheck className="h-4 w-4 shrink-0" />
											Los permisos se actualizaron correctamente
										</div>
									) : (
										<p className="text-sm text-slate-600">
											Los cambios se aplicarán en el próximo inicio de sesión de los moderadores.
										</p>
									)}
									<button
										type="button"
										onClick={handleGuardar}
										disabled={isSaving}
										className="inline-flex items-center justify-center gap-2 self-end rounded-xl bg-[#006965] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-500/25 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 sm:self-auto"
									>
										{isSaving ? (
											"Guardando..."
										) : (
											<>
												<Save className="h-4 w-4" />
												Guardar permisos
											</>
										)}
									</button>
								</div>
							</div>
						</>
					)}
				</section>
			</div>
		</PageShell>
	);
};

export default ModeradoresPage;
