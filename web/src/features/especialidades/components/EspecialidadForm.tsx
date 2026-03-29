import { useState, type FormEvent, useEffect } from "react";
import Swal from "sweetalert2";
import { Stethoscope } from "lucide-react";
import {
	useCreateEspecialidadMutation,
	useUpdateEspecialidadMutation,
} from "../especialidadesApi";
import type { Especialidad } from "../especialidadesApi";

type EspecialidadFormProps = {
	especialidad?: Especialidad | null;
	onSuccess: () => void;
	onCancel: () => void;
};

const EspecialidadForm = ({
	especialidad,
	onSuccess,
	onCancel,
}: EspecialidadFormProps) => {
	const [createEspecialidad, { isLoading: isCreating }] =
		useCreateEspecialidadMutation();
	const [updateEspecialidad, { isLoading: isUpdating }] =
		useUpdateEspecialidadMutation();
	const [nombre, setNombre] = useState(especialidad?.nombre ?? "");
	const [error, setError] = useState("");

	useEffect(() => {
		setNombre(especialidad?.nombre ?? "");
	}, [especialidad]);

	const isLoading = isCreating || isUpdating;
	const isEditing = !!especialidad;

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");

		if (!nombre.trim()) {
			setError("El nombre es requerido.");
			return;
		}

		try {
			if (isEditing) {
				await updateEspecialidad({
					id_especialidad: especialidad!.id_especialidad,
					nombre: nombre.trim(),
				}).unwrap();
				await Swal.fire({
					icon: "success",
					title: "Especialidad actualizada",
					text: "La especialidad ha sido actualizada exitosamente.",
					timer: 2000,
					showConfirmButton: false,
				});
			} else {
				await createEspecialidad({ nombre: nombre.trim() }).unwrap();
				await Swal.fire({
					icon: "success",
					title: "Especialidad creada",
					text: "La especialidad ha sido creada exitosamente.",
					timer: 2000,
					showConfirmButton: false,
				});
			}
			onSuccess();
		} catch (err: any) {
			const message =
				err?.data?.message || "No se pudo guardar la especialidad";
			setError(message);
			Swal.fire({
				icon: "error",
				title: "Error",
				text: message,
			});
		}
	};

	return (
		<form className="space-y-5" onSubmit={onSubmit}>
			{error && (
				<div
					className="rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm text-red-800"
					role="alert"
				>
					{error}
				</div>
			)}

			<div>
				<label
					htmlFor="especialidad-nombre"
					className="mb-2 block text-sm font-semibold text-brand-900"
				>
					Nombre <span className="text-red-500">*</span>
				</label>
				<div className="relative">
					<span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-700/80">
						<Stethoscope className="h-5 w-5" strokeWidth={2} aria-hidden />
					</span>
					<input
						id="especialidad-nombre"
						type="text"
						required
						autoComplete="off"
						autoFocus
						className="h-12 w-full rounded-2xl border border-brand-200 bg-cloud/50 pl-11 pr-4 text-sm text-brand-900 outline-none ring-brand-800/0 transition placeholder:text-brand-700/50 focus:border-brand-400 focus:bg-paper focus:ring-4 focus:ring-brand-500/20"
						value={nombre}
						onChange={(e) => setNombre(e.target.value)}
						placeholder="Ej: Cardiología, Neurología…"
					/>
				</div>
				<p className="mt-2 text-xs text-brand-700/85">
					Así aparecerá en fichas de especialistas y en los listados del sistema.
				</p>
			</div>

			<div className="flex flex-col-reverse gap-3 border-t border-mist pt-5 sm:flex-row sm:justify-end">
				<button
					type="button"
					onClick={onCancel}
					className="inline-flex h-11 items-center justify-center rounded-2xl border border-brand-200 bg-paper px-5 text-sm font-semibold text-brand-800 transition hover:bg-cloud"
				>
					Cancelar
				</button>
				<button
					type="submit"
					disabled={isLoading}
					className="inline-flex h-11 min-w-[160px] items-center justify-center rounded-2xl bg-brand-800 px-6 text-sm font-bold text-paper shadow-lg shadow-brand-900/20 transition hover:bg-brand-900 disabled:opacity-50"
				>
					{isLoading
						? isEditing
							? "Actualizando…"
							: "Creando…"
						: isEditing
							? "Guardar cambios"
							: "Crear especialidad"}
				</button>
			</div>
		</form>
	);
};

export default EspecialidadForm;
