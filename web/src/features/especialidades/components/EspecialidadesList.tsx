import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
	Activity,
	Building2,
	HeartPulse,
	LayoutGrid,
	Pencil,
	Plus,
	Sparkles,
	Stethoscope,
	Trash2,
	Users,
	X,
} from "lucide-react";
import {
	useGetEspecialidadesQuery,
	useDeleteEspecialidadMutation,
} from "../especialidadesApi";
import type { Especialidad } from "../especialidadesApi";
import EspecialidadForm from "./EspecialidadForm";

const CARD_ICONS = [
	Stethoscope,
	HeartPulse,
	Activity,
	Sparkles,
	Building2,
	LayoutGrid,
] as const;

/** Acentos alineados con `brand`, `mint`, `accent`, `ice` y `cloud` del tema Garvis */
const CARD_ACCENT = [
	"bg-brand-100 text-brand-800",
	"bg-mint/50 text-brand-900",
	"bg-accent/25 text-brand-900",
	"bg-brand-200/70 text-brand-900",
	"bg-ice/40 text-brand-800",
	"bg-cloud text-brand-900",
] as const;

const EspecialidadesList = () => {
	const { data: especialidades = [], isLoading, refetch } =
		useGetEspecialidadesQuery();
	const [deleteEspecialidad, { isLoading: isDeleting }] =
		useDeleteEspecialidadMutation();
	const [editingEspecialidad, setEditingEspecialidad] =
		useState<Especialidad | null>(null);
	const [showForm, setShowForm] = useState(false);

	const handleDelete = async (id: string, nombre: string) => {
		const result = await Swal.fire({
			icon: "warning",
			title: "¿Eliminar especialidad?",
			text: `Esta acción eliminará la especialidad "${nombre}". Esta acción no se puede deshacer.`,
			showCancelButton: true,
			confirmButtonText: "Sí, eliminar",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#dc2626",
		});

		if (!result.isConfirmed) return;

		try {
			await deleteEspecialidad(id).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Especialidad eliminada",
				text: "La especialidad ha sido eliminada exitosamente.",
				timer: 2000,
				showConfirmButton: false,
			});
			refetch();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo eliminar la especialidad",
			});
		}
	};

	const handleEdit = (especialidad: Especialidad) => {
		setEditingEspecialidad(especialidad);
		setShowForm(true);
	};

	const handleNew = () => {
		setEditingEspecialidad(null);
		setShowForm(true);
	};

	const handleFormSuccess = () => {
		setShowForm(false);
		setEditingEspecialidad(null);
		refetch();
	};

	const handleFormCancel = () => {
		setShowForm(false);
		setEditingEspecialidad(null);
	};

	useEffect(() => {
		if (!showForm) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setShowForm(false);
				setEditingEspecialidad(null);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = prev;
			window.removeEventListener("keydown", onKey);
		};
	}, [showForm]);

	const total = especialidades.length;

	return (
		<>
		<div className="mx-auto w-full max-w-7xl space-y-10 pb-8 pt-1 sm:pb-10">
			{/* Hero */}
			<section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
				<div className="min-w-0">
					<h1 className="font-headline text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">
						Especialidades
					</h1>
					<p className="mt-3 max-w-xl text-sm leading-relaxed text-brand-800/90">
						Administra el catálogo clínico del sistema. Define las áreas disponibles
						para el registro de especialistas y la coordinación operativa.
					</p>
				</div>
				<button
					type="button"
					onClick={handleNew}
					className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-800 px-6 py-3 text-sm font-bold text-paper shadow-lg shadow-brand-900/20 transition hover:bg-brand-900 active:scale-[0.98]"
				>
					<Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
					Nueva especialidad
				</button>
			</section>

			{/* KPIs */}
			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:max-w-4xl lg:gap-6">
				<div className="rounded-3xl border border-brand-200/60 bg-paper p-6 shadow-sm shadow-brand-900/5">
					<p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-700/80">
						Total especialidades
					</p>
					<div className="flex items-center justify-between gap-4">
						<span className="text-4xl font-black tabular-nums text-brand-900">
							{isLoading ? "…" : total}
						</span>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800">
							<Stethoscope className="h-5 w-5" aria-hidden />
						</div>
					</div>
				</div>
				<div className="rounded-3xl border border-brand-200/60 bg-paper p-6 shadow-sm shadow-brand-900/5">
					<p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-700/80">
						Catálogo activo
					</p>
					<div className="flex items-center justify-between gap-4">
						<span className="text-sm font-semibold leading-snug text-brand-800">
							{isLoading
								? "Cargando…"
								: total === 0
									? "Sin registros aún"
									: "Disponible para asignación a especialistas"}
						</span>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mint/40 text-brand-800">
							<Users className="h-5 w-5" aria-hidden />
						</div>
					</div>
				</div>
			</div>

			{isLoading ? (
				<div className="rounded-3xl border border-brand-200/50 bg-paper py-20 text-center text-sm font-medium text-brand-700 shadow-sm">
					Cargando especialidades…
				</div>
			) : especialidades.length === 0 ? (
				<div className="rounded-3xl border border-dashed border-brand-300/80 bg-paper p-12 text-center shadow-sm">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cloud text-brand-600">
						<LayoutGrid className="h-8 w-8" aria-hidden />
					</div>
					<p className="text-brand-800">No hay especialidades registradas.</p>
					<button
						type="button"
						onClick={handleNew}
						className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-800 px-5 py-2.5 text-sm font-semibold text-paper shadow-md shadow-brand-900/15 transition hover:bg-brand-900"
					>
						<Plus className="h-4 w-4" aria-hidden />
						Crear la primera especialidad
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4">
					{especialidades.map((esp, index) => {
						const Icon = CARD_ICONS[index % CARD_ICONS.length];
						const accent = CARD_ACCENT[index % CARD_ACCENT.length];
						return (
							<div
								key={esp.id_especialidad}
								className="flex flex-col justify-between rounded-3xl border border-brand-200/50 bg-paper p-6 shadow-sm shadow-brand-900/5 transition hover:border-brand-300 hover:shadow-md hover:shadow-brand-900/10"
							>
								<div>
									<div className="mb-6 flex items-start justify-between">
										<div
											className={`flex h-14 w-14 items-center justify-center rounded-2xl ${accent}`}
										>
											<Icon className="h-7 w-7" strokeWidth={2} aria-hidden />
										</div>
									</div>
									<h3 className="mb-1 text-xl font-bold text-brand-900">
										{esp.nombre}
									</h3>
									<p className="mb-4 text-xs text-brand-700/85">
										Especialidad médica · catálogo Garvis
									</p>
									<div className="flex flex-wrap items-center gap-2">
										<span className="inline-flex items-center rounded-md bg-brand-100 px-2 py-1 text-[10px] font-bold text-brand-900">
											En catálogo
										</span>
										<span className="inline-flex items-center rounded-md bg-cloud px-2 py-1 text-[10px] font-bold text-brand-800">
											Área clínica
										</span>
									</div>
								</div>
								<div className="mt-8 flex items-center justify-end gap-2 border-t border-mist pt-4">
									<button
										type="button"
										title="Editar"
										onClick={() => handleEdit(esp)}
										className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-200 bg-paper text-brand-700 transition hover:border-brand-400 hover:bg-brand-100 hover:text-brand-900"
									>
										<Pencil className="h-4 w-4" aria-hidden />
										<span className="sr-only">Editar {esp.nombre}</span>
									</button>
									<button
										type="button"
										title="Eliminar"
										disabled={isDeleting}
										onClick={() =>
											handleDelete(esp.id_especialidad, esp.nombre)
										}
										className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-paper text-red-600 transition hover:bg-red-50 disabled:opacity-50"
									>
										<Trash2 className="h-4 w-4" aria-hidden />
										<span className="sr-only">Eliminar {esp.nombre}</span>
									</button>
								</div>
							</div>
						);
					})}

					<button
						type="button"
						onClick={handleNew}
						className="group flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-brand-300/90 bg-paper/40 p-6 transition hover:border-brand-500 hover:bg-brand-100/40"
					>
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-cloud text-brand-500 transition group-hover:bg-brand-200/60 group-hover:text-brand-800">
							<Plus className="h-9 w-9" strokeWidth={2} aria-hidden />
						</div>
						<p className="text-sm font-bold text-brand-600 transition group-hover:text-brand-900">
							Añadir especialidad
						</p>
					</button>
				</div>
			)}
		</div>

		{showForm && (
			<div
				className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center sm:p-6"
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-especialidad-titulo"
			>
				<button
					type="button"
					className="absolute inset-0 bg-brand-900/40 backdrop-blur-[2px] transition-opacity"
					onClick={handleFormCancel}
					aria-label="Cerrar ventana"
				/>
				<div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-brand-200/80 bg-paper shadow-2xl shadow-brand-900/25">
					<div className="relative border-b border-mist px-6 pb-4 pt-6 sm:px-8">
						<div className="flex gap-4">
							<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-800">
								<Stethoscope className="h-6 w-6" strokeWidth={2} aria-hidden />
							</div>
							<div className="min-w-0 flex-1 pr-10">
								<h2
									id="modal-especialidad-titulo"
									className="font-headline text-xl font-bold tracking-tight text-brand-900"
								>
									{editingEspecialidad
										? "Editar especialidad"
										: "Nueva especialidad"}
								</h2>
								<p className="mt-1 text-sm leading-relaxed text-brand-800/90">
									{editingEspecialidad
										? "Actualiza el nombre que verán especialistas y administradores."
										: "Añade un área clínica al catálogo para asignarla a especialistas."}
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={handleFormCancel}
							className="absolute right-3 top-3 rounded-xl p-2 text-brand-600 transition hover:bg-cloud hover:text-brand-900 sm:right-5 sm:top-5"
							aria-label="Cerrar"
						>
							<X className="h-5 w-5" strokeWidth={2} />
						</button>
					</div>
					<div className="px-6 pb-6 pt-4 sm:px-8">
						<EspecialidadForm
							especialidad={editingEspecialidad}
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

export default EspecialidadesList;
