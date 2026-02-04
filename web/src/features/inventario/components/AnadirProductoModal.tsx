import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useCreateProductoMutation } from "../../productos/productosApi";
import Swal from "sweetalert2";

type AnadirProductoModalProps = {
	onClose: () => void;
	onSuccess?: () => void;
};

const AnadirProductoModal = ({ onClose, onSuccess }: AnadirProductoModalProps) => {
	const [form, setForm] = useState({
		nombre: "",
		unidad: "",
		stock_minimo: "0",
		precio: "",
		activo: true,
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	const [createProducto, { isLoading }] = useCreateProductoMutation();

	const clearError = (field: string) => {
		setErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
	};

	const validate = (): boolean => {
		const next: Record<string, string> = {};
		if (!form.nombre.trim()) next.nombre = "El nombre es requerido";
		else if (form.nombre.length > 255) next.nombre = "Máximo 255 caracteres";
		if (!form.unidad.trim()) next.unidad = "La unidad es requerida";
		else if (form.unidad.length > 20) next.unidad = "Máximo 20 caracteres";
		const stock = Number(form.stock_minimo);
		if (Number.isNaN(stock) || stock < 0) next.stock_minimo = "Stock mínimo debe ser un número ≥ 0";
		const precio = Number(form.precio);
		if (form.precio.trim() === "") next.precio = "El precio es requerido";
		else if (Number.isNaN(precio) || precio < 0) next.precio = "El precio debe ser un número ≥ 0";
		setErrors(next);
		return Object.keys(next).length === 0;
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!validate() || isLoading) return;
		try {
			await createProducto({
				nombre: form.nombre.trim(),
				unidad: form.unidad.trim(),
				stock_minimo: Number(form.stock_minimo) || 0,
				precio: Number(form.precio),
				activo: form.activo,
			}).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Producto creado",
				text: "El producto se ha registrado correctamente.",
				timer: 2000,
				showConfirmButton: false,
			});
			onSuccess?.();
			onClose();
		} catch (err: unknown) {
			const message =
				typeof err === "object" && err !== null && "data" in err
					? (err as { data?: { message?: string } }).data?.message
					: "No se pudo crear el producto";
			Swal.fire({
				icon: "error",
				title: "Error",
				text: message,
			});
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="relative w-full max-w-md rounded-xl bg-paper shadow-lg">
				<div className="flex items-center justify-between border-b border-mist p-4">
					<h2 className="text-lg font-semibold text-brand-900">Añadir producto</h2>
					<button
						onClick={onClose}
						className="rounded-lg p-1 text-brand-800 hover:bg-cloud"
						aria-label="Cerrar"
						disabled={isLoading}
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4 p-6">
					<div>
						<label htmlFor="nombre" className="mb-1 block text-sm font-medium text-brand-800">
							Nombre <span className="text-red-500">*</span>
						</label>
						<input
							id="nombre"
							type="text"
							value={form.nombre}
							onChange={(e) => {
								setForm((f) => ({ ...f, nombre: e.target.value }));
								clearError("nombre");
							}}
							className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-brand-900 shadow-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
							placeholder="Ej. Gel para ecografía"
							maxLength={255}
							disabled={isLoading}
						/>
						{errors.nombre && (
							<p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
						)}
					</div>

					<div>
						<label htmlFor="unidad" className="mb-1 block text-sm font-medium text-brand-800">
							Unidad <span className="text-red-500">*</span>
						</label>
						<input
							id="unidad"
							type="text"
							value={form.unidad}
							onChange={(e) => {
								setForm((f) => ({ ...f, unidad: e.target.value }));
								clearError("unidad");
							}}
							className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-brand-900 shadow-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
							placeholder="Ej. lt, kg, unidad"
							maxLength={20}
							disabled={isLoading}
						/>
						{errors.unidad && (
							<p className="mt-1 text-sm text-red-600">{errors.unidad}</p>
						)}
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label htmlFor="stock_minimo" className="mb-1 block text-sm font-medium text-brand-800">
								Stock mínimo
							</label>
							<input
								id="stock_minimo"
								type="number"
								min={0}
								value={form.stock_minimo}
								onChange={(e) => {
									setForm((f) => ({ ...f, stock_minimo: e.target.value }));
									clearError("stock_minimo");
								}}
								className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-brand-900 shadow-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
								disabled={isLoading}
							/>
							{errors.stock_minimo && (
								<p className="mt-1 text-sm text-red-600">{errors.stock_minimo}</p>
							)}
						</div>
						<div>
							<label htmlFor="precio" className="mb-1 block text-sm font-medium text-brand-800">
								Precio <span className="text-red-500">*</span>
							</label>
							<input
								id="precio"
								type="number"
								min={0}
								step={0.01}
								value={form.precio}
								onChange={(e) => {
									setForm((f) => ({ ...f, precio: e.target.value }));
									clearError("precio");
								}}
								className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-brand-900 shadow-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
								placeholder="0.00"
								disabled={isLoading}
							/>
							{errors.precio && (
								<p className="mt-1 text-sm text-red-600">{errors.precio}</p>
							)}
						</div>
					</div>

					<div className="flex items-center gap-2">
						<input
							id="activo"
							type="checkbox"
							checked={form.activo}
							onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
							className="h-4 w-4 rounded border-brand-600 text-brand-700 focus:ring-brand-500"
							disabled={isLoading}
						/>
						<label htmlFor="activo" className="text-sm font-medium text-brand-800">
							Producto activo
						</label>
					</div>

					<div className="flex gap-3 pt-2">
						<button
							type="button"
							onClick={onClose}
							disabled={isLoading}
							className="flex-1 rounded-lg border border-brand-300 bg-paper px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={isLoading}
							className="flex-1 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper hover:bg-brand-800 disabled:opacity-50"
						>
							{isLoading ? "Guardando..." : "Guardar"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default AnadirProductoModal;
