import { useEffect, useState } from "react";
import { PageShell } from "../../../shared";
import { ShieldCheck, Package, FileText, Users, Home, DollarSign, Receipt, Save } from "lucide-react";
import {
	useGetPermisosInventarioModeradorQuery,
	useUpdatePermisosInventarioModeradorMutation,
	type PermisosInventario,
} from "../../roles/rolesApi";

const SECCIONES: { key: keyof PermisosInventario; label: string; icon: any; description: string }[] = [
	{ key: "productos", label: "Producto", icon: Package, description: "Gestión del catálogo y stock." },
	{ key: "entes", label: "Entes Legales", icon: FileText, description: "Administración de empresas clientes." },
	{ key: "nomina", label: "Nómina", icon: Users, description: "Visualización de pagos a empleados." },
	{ key: "alquiler", label: "Alquiler", icon: Home, description: "Control de alquileres de consultorios." },
	{ key: "comisiones", label: "Comisiones", icon: DollarSign, description: "Cálculo financiero y comisiones." },
	{ key: "facturacion", label: "Facturación", icon: Receipt, description: "Acceso al sistema de facturación." },
];

const defaultPermisos: PermisosInventario = {
	productos: true,
	entes: true,
	nomina: true,
	alquiler: true,
	comisiones: true,
	facturacion: false,
};

const ModeradoresPage = () => {
	const { data: permisos, isLoading } = useGetPermisosInventarioModeradorQuery();
	const [updatePermisos, { isLoading: isSaving }] =
		useUpdatePermisosInventarioModeradorMutation();
	const [local, setLocal] = useState<PermisosInventario>(defaultPermisos);
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		if (permisos) setLocal({ ...defaultPermisos, ...permisos });
	}, [permisos]);

	const handleToggle = (key: keyof PermisosInventario) => {
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
			title="Moderadores"
			description="Administración de moderadores y permisos de inventario."
		>
			<div className="mx-auto max-w-5xl space-y-6">
				<section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
					<div className="mb-6 flex items-start gap-4 border-b border-gray-100 pb-5">
						<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
							<ShieldCheck className="h-6 w-6" />
						</div>
						<div>
							<h2 className="text-xl font-bold text-gray-900">
								Permisos de inventario para moderadores
							</h2>
							<p className="mt-1 text-sm text-gray-600">
								Activa o desactiva qué módulos del inventario pueden ver y usar los
								moderadores. Estos cambios se aplicarán inmediatamente a todos los usuarios con el rol moderador.
							</p>
						</div>
					</div>

					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-100 border-t-teal-600"></div>
						</div>
					) : (
						<>
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{SECCIONES.map(({ key, label, icon: Icon, description }) => {
									const isActive = Boolean(local[key]);
									return (
										<div
											key={key}
											onClick={() => handleToggle(key)}
											className={`group relative flex cursor-pointer flex-col gap-4 rounded-xl border p-5 transition-all hover:shadow-md ${
												isActive
													? "border-teal-500 bg-teal-50/20"
													: "border-gray-200 bg-white hover:border-gray-300"
											}`}
										>
											<div className="flex items-center justify-between">
												<div
													className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
														isActive
															? "bg-teal-600 text-white shadow-sm"
															: "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
													}`}
												>
													<Icon className="h-5 w-5" />
												</div>
												{/* Toggle Switch */}
												<button
													type="button"
													className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
														isActive ? "bg-teal-600 border-2 border-teal-600" : "bg-gray-50 border-2 border-gray-300"
													}`}
													role="switch"
													aria-checked={isActive}
												>
													<span
														aria-hidden="true"
														className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
															isActive ? "translate-x-5" : "translate-x-0"
														}`}
													/>
												</button>
											</div>
											<div>
												<h3
													className={`font-semibold transition-colors ${
														isActive ? "text-gray-900" : "text-gray-700"
													}`}
												>
													{label}
												</h3>
												<p className="mt-1 text-xs text-gray-500">{description}</p>
											</div>
										</div>
									);
								})}
							</div>

							<div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row border-t border-gray-100 pt-6">
								{saved ? (
									<div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700 border border-green-200 transition-all">
										<ShieldCheck className="h-4 w-4" />
										Los permisos se actualizaron correctamente
									</div>
								) : (
									<p className="text-sm text-gray-500">
										No olvides guardar los cambios al terminar.
									</p>
								)}
								
								<button
									type="button"
									onClick={handleGuardar}
									disabled={isSaving}
									className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-teal-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-teal-500/20 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
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
						</>
					)}
				</section>
			</div>
		</PageShell>
	);
};

export default ModeradoresPage;
