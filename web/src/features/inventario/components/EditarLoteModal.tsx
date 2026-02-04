import { useState, type FormEvent, useEffect } from "react";
import { X } from "lucide-react";
import { useUpdateProductoLoteMutation } from "../../productos/productosApi";
import type { ProductoLote } from "../../productos/productosApi";
import Swal from "sweetalert2";

type EditarLoteModalProps = {
	productoNombre: string;
	lote: ProductoLote;
	onClose: () => void;
	onSuccess?: () => void;
};

const EditarLoteModal = ({ productoNombre, lote, onClose, onSuccess }: EditarLoteModalProps) => {
	const [form, setForm] = useState({
		cantidad: String(lote.cantidad),
		fecha_ingreso: lote.fecha_ingreso.slice(0, 10),
		fecha_vencimiento: lote.fecha_vencimiento ? lote.fecha_vencimiento.slice(0, 10) : "",
		costo_total: lote.costo_total != null ? String(lote.costo_total) : "",
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	const [updateLote, { isLoading }] = useUpdateProductoLoteMutation();

	useEffect(() => {
		setForm({
			cantidad: String(lote.cantidad),
			fecha_ingreso: lote.fecha_ingreso.slice(0, 10),
			fecha_vencimiento: lote.fecha_vencimiento ? lote.fecha_vencimiento.slice(0, 10) : "",
			costo_total: lote.costo_total != null ? String(lote.costo_total) : "",
		});
	}, [lote]);

	const clearError = (field: string) => {
		setErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
	};

	const validate = (): boolean => {
		const next: Record<string, string> = {};
		const cantidad = Number(form.cantidad);
		if (form.cantidad.trim() === "") next.cantidad = "La cantidad es requerida";
		else if (Number.isNaN(cantidad) || cantidad <= 0) next.cantidad = "La cantidad debe ser mayor a 0";
		if (!form.fecha_ingreso) next.fecha_ingreso = "La fecha de ingreso es requerida";
		const costo = form.costo_total.trim() ? Number(form.costo_total) : null;
		if (costo !== null && (Number.isNaN(costo) || costo < 0)) next.costo_total = "El costo debe ser un número ≥ 0";
		setErrors(next);
		return Object.keys(next).length === 0;
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!validate() || isLoading) return;
		try {
			await updateLote({
				id_producto: lote.id_producto,
				id_lote: lote.id_lote,
				cantidad: Number(form.cantidad),
				fecha_ingreso: form.fecha_ingreso,
				fecha_vencimiento: form.fecha_vencimiento.trim() || null,
				costo_total: form.costo_total.trim() ? Number(form.costo_total) : null,
			}).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Lote actualizado",
				text: "Los cambios se guardaron correctamente.",
				timer: 2000,
				showConfirmButton: false,
			});
			onSuccess?.();
			onClose();
		} catch (err: unknown) {
			const message =
				typeof err === "object" && err !== null && "data" in err
					? (err as { data?: { message?: string } }).data?.message
					: "No se pudo actualizar el lote";
			Swal.fire({
				icon: "error",
				title: "Error",
				text: message,
			});
		}
	};

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
			<div className="relative w-full max-w-md rounded-xl bg-paper shadow-lg">
				<div className="flex items-center justify-between border-b border-mist p-4">
					<h2 className="text-lg font-semibold text-brand-900">Editar lote</h2>
					<button
						onClick={onClose}
						className="rounded-lg p-1 text-brand-800 hover:bg-cloud"
						aria-label="Cerrar"
						disabled={isLoading}
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				<div className="border-b border-mist px-4 py-2 text-sm text-brand-700">
					Producto: <span className="font-semibold text-brand-900">{productoNombre}</span>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4 p-6">
					<div>
						<label htmlFor="edit-lote-cantidad" className="mb-1 block text-sm font-medium text-brand-800">
							Cantidad <span className="text-red-500">*</span>
						</label>
						<input
							id="edit-lote-cantidad"
							type="number"
							min={1}
							value={form.cantidad}
							onChange={(e) => {
								setForm((f) => ({ ...f, cantidad: e.target.value }));
								clearError("cantidad");
							}}
							className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-brand-900 shadow-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
							disabled={isLoading}
						/>
						{errors.cantidad && <p className="mt-1 text-sm text-red-600">{errors.cantidad}</p>}
					</div>

					<div>
						<label htmlFor="edit-lote-fecha_ingreso" className="mb-1 block text-sm font-medium text-brand-800">
							Fecha de ingreso <span className="text-red-500">*</span>
						</label>
						<input
							id="edit-lote-fecha_ingreso"
							type="date"
							value={form.fecha_ingreso}
							onChange={(e) => {
								setForm((f) => ({ ...f, fecha_ingreso: e.target.value }));
								clearError("fecha_ingreso");
							}}
							className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-brand-900 shadow-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
							disabled={isLoading}
						/>
						{errors.fecha_ingreso && <p className="mt-1 text-sm text-red-600">{errors.fecha_ingreso}</p>}
					</div>

					<div>
						<label htmlFor="edit-lote-fecha_vencimiento" className="mb-1 block text-sm font-medium text-brand-800">
							Fecha de vencimiento (opcional)
						</label>
						<input
							id="edit-lote-fecha_vencimiento"
							type="date"
							value={form.fecha_vencimiento}
							onChange={(e) => setForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))}
							className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-brand-900 shadow-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
							disabled={isLoading}
						/>
					</div>

					<div>
						<label htmlFor="edit-lote-costo_total" className="mb-1 block text-sm font-medium text-brand-800">
							Costo total de la compra (opcional)
						</label>
						<input
							id="edit-lote-costo_total"
							type="number"
							min={0}
							step={0.01}
							value={form.costo_total}
							onChange={(e) => {
								setForm((f) => ({ ...f, costo_total: e.target.value }));
								clearError("costo_total");
							}}
							className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-brand-900 shadow-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
							disabled={isLoading}
						/>
						{errors.costo_total && <p className="mt-1 text-sm text-red-600">{errors.costo_total}</p>}
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
							{isLoading ? "Guardando..." : "Guardar cambios"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default EditarLoteModal;
