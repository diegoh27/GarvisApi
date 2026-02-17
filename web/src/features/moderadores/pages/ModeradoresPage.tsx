import { useEffect, useState } from "react";
import { PageShell } from "../../../shared";
import {
	useGetPermisosInventarioModeradorQuery,
	useUpdatePermisosInventarioModeradorMutation,
	type PermisosInventario,
} from "../../roles/rolesApi";

const SECCIONES: { key: keyof PermisosInventario; label: string }[] = [
	{ key: "productos", label: "Producto" },
	{ key: "entes", label: "Entes Legales" },
	{ key: "nomina", label: "Nómina" },
	{ key: "alquiler", label: "Alquiler" },
	{ key: "comisiones", label: "Comisiones" },
	{ key: "facturacion", label: "Facturación" },
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
			<div className="space-y-6">
				<section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
					<h2 className="mb-2 text-lg font-semibold text-gray-800">
						Permisos de inventario para moderadores
					</h2>
					<p className="mb-4 text-sm text-gray-600">
						Marca qué pestañas del módulo Inventario puede ver y usar el rol
						moderador. Los cambios aplican para todos los moderadores.
					</p>
					{isLoading ? (
						<p className="text-sm text-gray-500">Cargando...</p>
					) : (
						<>
							<div className="flex flex-wrap gap-4">
								{SECCIONES.map(({ key, label }) => (
									<label
										key={key}
										className="flex cursor-pointer items-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100"
									>
										<input
											type="checkbox"
											checked={Boolean(local[key])}
											onChange={() => handleToggle(key)}
											className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
										/>
										<span className="text-sm font-medium text-gray-700">
											{label}
										</span>
									</label>
								))}
							</div>
							<div className="mt-4 flex items-center gap-3">
								<button
									type="button"
									onClick={handleGuardar}
									disabled={isSaving}
									className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
								>
									{isSaving ? "Guardando..." : "Guardar permisos"}
								</button>
								{saved && (
									<span className="text-sm text-green-600">
										Permisos guardados correctamente.
									</span>
								)}
							</div>
						</>
					)}
				</section>
			</div>
		</PageShell>
	);
};

export default ModeradoresPage;
