import { useState } from "react";
import Swal from "sweetalert2";
import {
	Activity,
	Clock,
	Pencil,
	PlusCircle,
	Trash2,
	X,
} from "lucide-react";
import { useGetEcosQuery, useDeleteEcoMutation } from "../ecosApi";
import type { Eco } from "../ecosApi";
import EcoForm, { PREDEFINED_ICONS } from "./EcoForm";

const formatPrecio = (precio: number) => {
	return new Intl.NumberFormat("es-VE", {
		style: "currency",
		currency: "USD",
	}).format(precio);
};

/** Variaciones suaves dentro de la paleta Garvis (brand / cloud / mist) */
const ICON_BOXES = [
	{ box: "bg-brand-100 text-brand-800" },
	{ box: "bg-cloud text-brand-800" },
	{ box: "bg-mist text-brand-900" },
	{ box: "bg-brand-100 text-brand-700" },
] as const;

/** Misma proporción que la fila de cabeceras: nombre · duración · precio · estado · acciones */
const ROW_GRID =
	"md:grid md:grid-cols-[38fr_14fr_16fr_16fr_16fr] md:items-center md:gap-x-4";

const EcosList = () => {
	const { data: ecos = [], isLoading, refetch } = useGetEcosQuery();
	const [deleteEco, { isLoading: isDeleting }] = useDeleteEcoMutation();
	const [editingEco, setEditingEco] = useState<Eco | null>(null);
	const [showForm, setShowForm] = useState(false);

	const totalEcos = ecos.length;
	const ecosActivos = ecos.filter((e) => e.activo === 1).length;

	const handleDelete = async (id: string, nombre: string) => {
		const result = await Swal.fire({
			icon: "warning",
			title: "¿Eliminar eco?",
			text: `Esta acción eliminará el eco "${nombre}". Esta acción no se puede deshacer.`,
			showCancelButton: true,
			confirmButtonText: "Sí, eliminar",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#dc2626",
		});

		if (!result.isConfirmed) return;

		try {
			await deleteEco(id).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Eco eliminado",
				text: "El eco ha sido eliminado exitosamente.",
				timer: 2000,
				showConfirmButton: false,
			});
			refetch();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo eliminar el eco",
			});
		}
	};

	const handleEdit = (eco: Eco) => {
		setEditingEco(eco);
		setShowForm(true);
	};

	const handleNew = () => {
		setEditingEco(null);
		setShowForm(true);
	};

	const handleFormSuccess = () => {
		setShowForm(false);
		setEditingEco(null);
		refetch();
	};

	const handleFormCancel = () => {
		setShowForm(false);
		setEditingEco(null);
	};

	return (
		<>
		<div className="space-y-8">
			<div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
				<div className="max-w-2xl space-y-2">
					<span className="text-xs font-bold uppercase tracking-widest text-brand-800">
						Gestión clínica
					</span>
					<h2 className="text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">
						Catálogo de ecos
					</h2>
					<p className="text-sm leading-relaxed text-brand-900/70">
						Administra los estudios ecográficos disponibles, precios y duraciones para la
						agenda de pacientes.
					</p>
				</div>
				<button
					type="button"
					onClick={handleNew}
					className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3.5 text-sm font-bold text-paper shadow-lg shadow-brand-900/10 transition hover:bg-brand-800"
				>
					<PlusCircle className="h-5 w-5" aria-hidden />
					Nuevo eco
				</button>
			</div>

			{isLoading ? (
				<div className="rounded-2xl border border-brand-200/80 bg-paper py-16 text-center text-brand-800/80">
					Cargando ecos...
				</div>
			) : ecos.length === 0 ? (
				<div className="rounded-2xl border border-brand-200/80 bg-paper p-12 text-center shadow-sm">
					<p className="text-brand-800/90">No hay ecos registrados.</p>
				</div>
			) : (
				<>
					<div className="rounded-2xl border border-brand-200/60 bg-paper p-6 sm:p-8 shadow-sm">
						<h3 className="mb-6 text-lg font-bold text-brand-900">Resumen del catálogo</h3>
						<div className="flex flex-col gap-6 sm:flex-row sm:items-stretch sm:gap-0">
							<div className="flex-1">
								<p className="mb-1 text-sm text-brand-900/60">Total estudios</p>
								<p className="text-3xl font-extrabold text-brand-800">{totalEcos}</p>
							</div>
							<div
								className="hidden w-px shrink-0 bg-brand-200 sm:block self-center sm:h-12"
								aria-hidden
							/>
							<div className="flex-1 sm:pl-8">
								<p className="mb-1 text-sm text-brand-900/60">Catálogo activo</p>
								<p className="text-3xl font-extrabold text-brand-800">{ecosActivos}</p>
							</div>
						</div>
					</div>

					<div className="space-y-4">
						<p className="text-xs font-bold uppercase tracking-widest text-brand-900/45">
							Lista de estudios
						</p>
						<div
							className={`hidden px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-brand-900/45 ${ROW_GRID}`}
						>
							<div className="pl-4">Nombre del estudio</div>
							<div>Duración</div>
							<div>Precio (USD)</div>
							<div>Estado</div>
							<div className="pr-2 text-right">Acciones</div>
						</div>

						<ul className="flex flex-col gap-3 md:gap-4">
							{ecos.map((eco, index) => {
								const { box } = ICON_BOXES[index % ICON_BOXES.length];
								const activo = eco.activo === 1;

								let IconComponent = Activity;
								let isImage = false;
								
								if (eco.icono && (eco.icono.startsWith("http") || eco.icono.startsWith("/uploads"))) {
									isImage = true;
								} else if (eco.icono) {
									const found = PREDEFINED_ICONS.find(pi => pi.name === eco.icono);
									if (found) {
										IconComponent = found.icon;
									}
								}

								return (
									<li
										key={eco.id_eco}
										className={`flex flex-col gap-4 rounded-2xl border border-brand-200/60 bg-paper px-4 py-4 shadow-sm transition hover:border-brand-300 hover:shadow-md ${ROW_GRID} md:px-6 md:py-5 ${
											!activo ? "opacity-90 grayscale-[0.25]" : ""
										}`}
									>
										<div className="flex min-w-0 items-center gap-4">
											<div
												className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl overflow-hidden ${box}`}
											>
												{isImage ? (
													<img src={eco.icono} alt={eco.nombre} className="h-full w-full object-cover" />
												) : (
													<IconComponent className="h-6 w-6" aria-hidden />
												)}
											</div>
											<div className="min-w-0">
												<p className="font-bold text-brand-900">{eco.nombre}</p>
												<p className="text-xs font-medium text-brand-900/50">{eco.etiqueta || "Sin categoría"}</p>
											</div>
										</div>
										<div className="flex items-center gap-2 border-t border-brand-200/50 pt-3 text-brand-800 md:border-0 md:pt-0">
											<Clock
												className="h-4 w-4 shrink-0 text-brand-800/50"
												aria-hidden
											/>
											<span className="text-sm font-medium">{eco.duracion_min} min</span>
										</div>
										<div className="border-t border-brand-200/50 pt-2 font-bold text-brand-900 md:border-0 md:pt-0">
											{formatPrecio(eco.precio)}
										</div>
										<div className="border-t border-brand-200/50 pt-2 md:border-0 md:pt-0">
											{activo ? (
												<span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-800">
													<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-700" />
													Activo
												</span>
											) : (
												<span className="inline-flex items-center gap-1.5 rounded-full bg-shell-muted/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-900/55">
													<span className="h-1.5 w-1.5 rounded-full bg-brand-900/35" />
													Inactivo
												</span>
											)}
										</div>
										<div className="flex justify-end gap-1 border-t border-brand-200/50 pt-3 md:border-0 md:pt-0">
											<button
												type="button"
												onClick={() => handleEdit(eco)}
												className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-900/40 transition hover:bg-brand-100 hover:text-brand-800"
												aria-label={`Editar ${eco.nombre}`}
											>
												<Pencil className="h-5 w-5" />
											</button>
											<button
												type="button"
												onClick={() => handleDelete(eco.id_eco, eco.nombre)}
												disabled={isDeleting}
												className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-900/40 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
												aria-label={`Eliminar ${eco.nombre}`}
											>
												<Trash2 className="h-5 w-5" />
											</button>
										</div>
									</li>
								);
							})}
						</ul>
					</div>
				</>
			)}
		</div>

		{showForm && (
			<div
				className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center sm:p-6"
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-eco-titulo"
			>
				<button
					type="button"
					className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] transition-opacity"
					onClick={handleFormCancel}
					aria-label="Cerrar ventana"
				/>
				<div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-brand-200/80 bg-paper shadow-2xl shadow-brand-900/15">
					<div className="relative border-b border-brand-200/60 px-6 pb-4 pt-6">
						<div className="flex gap-4">
							<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-800">
								<Activity className="h-6 w-6" strokeWidth={2} aria-hidden />
							</div>
							<div className="min-w-0 flex-1 pr-10">
								<h2
									id="modal-eco-titulo"
									className="text-xl font-bold tracking-tight text-brand-900"
								>
									{editingEco ? "Editar eco" : "Nuevo eco"}
								</h2>
								<p className="mt-1 text-sm leading-relaxed text-brand-900/55">
									{editingEco
										? "Actualiza nombre, precio, duración o estado del estudio."
										: "Completa los datos del estudio para el catálogo y la agenda."}
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={handleFormCancel}
							className="absolute right-4 top-4 rounded-xl p-2 text-brand-900/40 transition hover:bg-brand-100 hover:text-brand-800"
							aria-label="Cerrar"
						>
							<X className="h-5 w-5" strokeWidth={2} />
						</button>
					</div>
					<div className="px-6 pb-6 pt-4">
						<EcoForm
							eco={editingEco}
							onSuccess={handleFormSuccess}
							onCancel={handleFormCancel}
						/>
					</div>
				</div>
			</div>
		)}
		</>
	);
};

export default EcosList;
