import { useState, type FormEvent, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import { useCreateEcoMutation, useUpdateEcoMutation, useGetEcosQuery } from "../ecosApi";
import type { Eco } from "../ecosApi";

type EcoFormProps = {
	eco?: Eco | null;
	onSuccess: () => void;
	onCancel: () => void;
};

const EcoForm = ({ eco, onSuccess, onCancel }: EcoFormProps) => {
	const [createEco, { isLoading: isCreating }] = useCreateEcoMutation();
	const [updateEco, { isLoading: isUpdating }] = useUpdateEcoMutation();
	const { data: ecos = [] } = useGetEcosQuery();
	const [form, setForm] = useState({
		nombre: eco?.nombre || "",
		precio: eco?.precio ? String(eco.precio) : "",
		duracion_min: eco?.duracion_min ? String(eco.duracion_min) : "",
		activo: eco?.activo !== undefined ? eco.activo : 1,
	});
	const [error, setError] = useState("");
	const [nombreError, setNombreError] = useState("");

	useEffect(() => {
		if (eco) {
			setForm({
				nombre: eco.nombre,
				precio: String(eco.precio),
				duracion_min: String(eco.duracion_min),
				activo: eco.activo,
			});
		}
	}, [eco]);

	const isLoading = isCreating || isUpdating;
	const isEditing = !!eco;

	// Validar si el nombre ya existe (case-insensitive)
	const nombreExists = useMemo(() => {
		if (!form.nombre.trim()) return false;
		const nombreNormalized = form.nombre.trim().toLowerCase();
		return ecos.some(
			(e) =>
				e.nombre.toLowerCase() === nombreNormalized &&
				(!isEditing || e.id_eco !== eco?.id_eco)
		);
	}, [form.nombre, ecos, isEditing, eco?.id_eco]);

	const updateField = (field: keyof typeof form, value: string | number) => {
		setForm((prev) => ({ ...prev, [field]: value }));
		setError("");
		if (field === "nombre") {
			setNombreError("");
		}
	};

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setNombreError("");

		if (!form.nombre.trim()) {
			setError("El nombre es requerido.");
			return;
		}

		// Validar que el nombre no esté duplicado
		if (nombreExists) {
			setNombreError("Ya existe un eco con ese nombre.");
			setError("Ya existe un eco con ese nombre.");
			return;
		}

		if (!form.precio || Number(form.precio) < 0) {
			setError("El precio debe ser un número positivo.");
			return;
		}

		try {
			if (isEditing) {
				await updateEco({
					id_eco: eco!.id_eco,
					nombre: form.nombre.trim(),
					precio: Number(form.precio),
					duracion_min: form.duracion_min ? Number(form.duracion_min) : 0,
					activo: Number(form.activo),
				}).unwrap();
				await Swal.fire({
					icon: "success",
					title: "Eco actualizado",
					text: "El eco ha sido actualizado exitosamente.",
					timer: 2000,
					showConfirmButton: false,
				});
			} else {
				await createEco({
					nombre: form.nombre.trim(),
					precio: Number(form.precio),
					duracion_min: form.duracion_min ? Number(form.duracion_min) : 0,
				}).unwrap();
				await Swal.fire({
					icon: "success",
					title: "Eco creado",
					text: "El eco ha sido creado exitosamente.",
					timer: 2000,
					showConfirmButton: false,
				});
			}
			onSuccess();
		} catch (err: any) {
			const message = err?.data?.message || "No se pudo guardar el eco";
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
					className={`h-11 w-full rounded-lg border bg-paper px-3 text-sm outline-none focus:border-brand-500 ${
						nombreError || nombreExists
							? "border-red-500 focus:border-red-500"
							: "border-brand-300"
					}`}
					value={form.nombre}
					onChange={(e) => updateField("nombre", e.target.value)}
					onBlur={() => {
						if (nombreExists) {
							setNombreError("Ya existe un eco con ese nombre.");
						}
					}}
					placeholder="Ej: Eco abdominal, Eco cardíaco..."
				/>
				{(nombreError || nombreExists) && (
					<p className="mt-1 text-xs text-red-600">{nombreError || "Ya existe un eco con ese nombre."}</p>
				)}
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label className="mb-1 block text-sm font-medium text-brand-700">
						Precio <span className="text-red-500">*</span>
					</label>
					<input
						type="number"
						required
						min="0"
						step="0.01"
						className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
						value={form.precio}
						onChange={(e) => updateField("precio", e.target.value)}
						placeholder="0.00"
					/>
				</div>
				<div>
					<label className="mb-1 block text-sm font-medium text-brand-700">
						Duración (minutos)
					</label>
					<input
						type="number"
						min="0"
						className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
						value={form.duracion_min}
						onChange={(e) => updateField("duracion_min", e.target.value)}
						placeholder="0"
					/>
				</div>
			</div>

			{isEditing && (
				<div>
					<label className="mb-1 block text-sm font-medium text-brand-700">
						Estado
					</label>
					<select
						className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
						value={form.activo}
						onChange={(e) => updateField("activo", Number(e.target.value))}
					>
						<option value={1}>Activo</option>
						<option value={0}>Inactivo</option>
					</select>
				</div>
			)}

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
							? "Actualizar eco"
							: "Crear eco"}
				</button>
			</div>
		</form>
	);
};

export default EcoForm;
