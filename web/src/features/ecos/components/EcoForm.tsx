import { useState, type FormEvent, useEffect, useMemo, useRef } from "react";
import Swal from "sweetalert2";
import { useCreateEcoMutation, useUpdateEcoMutation, useGetEcosQuery } from "../ecosApi";
import type { Eco } from "../ecosApi";
import { MONTO_MIN, MONTO_MAX, sanitizeMonto, validarMonto } from "../../inventario/utils/validation";

const DURACION_CREAR = 20;

type EcoFormProps = {
	eco?: Eco | null;
	onSuccess: () => void;
	onCancel: () => void;
};

const EcoForm = ({ eco, onSuccess, onCancel }: EcoFormProps) => {
	const [createEco, { isLoading: isCreating }] = useCreateEcoMutation();
	const [updateEco, { isLoading: isUpdating }] = useUpdateEcoMutation();
	const { data: ecos = [], refetch: refetchEcos } = useGetEcosQuery();
	const submittedRef = useRef(false);
	/** Nombre que acabamos de crear; evita mostrar "ya existe" tras el refetch */
	const justCreatedNombreRef = useRef<string | null>(null);
	const [form, setForm] = useState({
		nombre: eco?.nombre || "",
		precio: eco?.precio ? String(eco.precio) : "",
		duracion_min: eco?.duracion_min ? String(eco.duracion_min) : String(DURACION_CREAR),
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
		} else {
			setForm((prev) => ({
				...prev,
				duracion_min: String(DURACION_CREAR),
			}));
		}
	}, [eco]);

	const isLoading = isCreating || isUpdating;
	const isEditing = !!eco;

	// Validar si el nombre ya existe (case-insensitive). No contar el que acabamos de crear.
	const nombreExists = useMemo(() => {
		if (!form.nombre.trim()) return false;
		const nombreNormalized = form.nombre.trim().toLowerCase();
		if (!isEditing && justCreatedNombreRef.current === nombreNormalized) return false;
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
		if (submittedRef.current) return;
		setError("");
		setNombreError("");

		if (!form.nombre.trim()) {
			setError("El nombre es requerido.");
			return;
		}

		if (nombreExists) {
			setNombreError("Ya existe un eco con ese nombre.");
			setError("Ya existe un eco con ese nombre.");
			return;
		}

		const errPrecio = validarMonto(form.precio);
		if (errPrecio) {
			setError(errPrecio);
			return;
		}

		submittedRef.current = true;
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
					duracion_min: DURACION_CREAR,
				}).unwrap();
				justCreatedNombreRef.current = form.nombre.trim().toLowerCase();
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
			submittedRef.current = false;
			const message = err?.data?.message || "No se pudo guardar el eco";
			const status = err?.status;
			// Si el backend devuelve 409 "ya existe" al crear, puede ser race: el eco ya se creó. Comprobamos.
			if (!isEditing && status === 409 && message.toLowerCase().includes("ya existe")) {
				const { data: listAfter } = await refetchEcos();
				const nombreNorm = form.nombre.trim().toLowerCase();
				const exists = (listAfter ?? []).some((e) => e.nombre.toLowerCase() === nombreNorm);
				if (exists) {
					justCreatedNombreRef.current = nombreNorm;
					await Swal.fire({
						icon: "success",
						title: "Eco creado",
						text: "El eco ha sido creado exitosamente.",
						timer: 2000,
						showConfirmButton: false,
					});
					onSuccess();
					return;
				}
			}
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
					className={`h-11 w-full rounded-lg border bg-paper px-3 text-sm outline-none focus:border-brand-500 ${nombreError || nombreExists
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
						Precio ($) <span className="text-red-500">*</span> (mín. 0,01)
					</label>
					<input
						type="number"
						required
						min={MONTO_MIN}
						max={MONTO_MAX}
						step="0.01"
						className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
						value={form.precio}
						onChange={(e) => updateField("precio", sanitizeMonto(e.target.value))}
						placeholder="0.01"
					/>
				</div>
				<div>
					<label className="mb-1 block text-sm font-medium text-brand-700">
						Duración (minutos)
					</label>
					<input
						type="number"
						min="0"
						disabled={!isEditing}
						className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500 disabled:bg-cloud disabled:cursor-not-allowed"
						value={isEditing ? form.duracion_min : String(DURACION_CREAR)}
						onChange={(e) => updateField("duracion_min", e.target.value)}
						placeholder="0"
					/>
					{!isEditing && (
						<p className="mt-1 text-xs text-brand-600">
							Al crear un eco la duración es fija: 20 minutos.
						</p>
					)}
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
