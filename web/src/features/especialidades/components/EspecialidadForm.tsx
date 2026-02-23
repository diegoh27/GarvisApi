import { useState, type FormEvent, useEffect } from "react";
import Swal from "sweetalert2";
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
	const [nombre, setNombre] = useState(especialidad?.nombre || "");
	const [error, setError] = useState("");

	useEffect(() => {
		if (especialidad) {
			setNombre(especialidad.nombre);
		}
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
		<form className="space-y-4" onSubmit={onSubmit}>
			{error && (
				<div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
					{error}
				</div>
			)}

			<div>
				<label className="mb-1 block text-sm font-medium text-brand-700">
					Nombre <span className="text-red-500">*</span>
				</label>
				<input
					type="text"
					required
					className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
					value={nombre}
					onChange={(e) => setNombre(e.target.value)}
					placeholder="Ej: Cardiología, Neurología..."
				/>
			</div>

			<div className="flex gap-3 pt-4">
				<button
					type="button"
					onClick={onCancel}
					className="flex-1 rounded-lg border border-brand-300 bg-paper px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
				>
					Cancelar
				</button>
				<button
					type="submit"
					disabled={isLoading}
					className="flex-1 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800 disabled:opacity-50"
				>
					{isLoading
						? isEditing
							? "Actualizando..."
							: "Creando..."
						: isEditing
							? "Actualizar especialidad"
							: "Crear especialidad"}
				</button>
			</div>
		</form>
	);
};

export default EspecialidadForm;
