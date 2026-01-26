import { useState } from "react";
import Swal from "sweetalert2";
import { useGetEcosQuery, useDeleteEcoMutation } from "../ecosApi";
import type { Eco } from "../ecosApi";
import EcoForm from "./EcoForm";

const formatPrecio = (precio: number) => {
	return new Intl.NumberFormat("es-VE", {
		style: "currency",
		currency: "USD",
	}).format(precio);
};

const EcosList = () => {
	const { data: ecos = [], isLoading, refetch } = useGetEcosQuery();
	const [deleteEco, { isLoading: isDeleting }] = useDeleteEcoMutation();
	const [editingEco, setEditingEco] = useState<Eco | null>(null);
	const [showForm, setShowForm] = useState(false);

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

	if (showForm) {
		return (
			<div className="rounded-lg border border-brand-200 bg-paper p-6">
				<h2 className="mb-4 text-lg font-semibold text-brand-900">
					{editingEco ? "Editar eco" : "Nuevo eco"}
				</h2>
				<EcoForm
					eco={editingEco}
					onSuccess={handleFormSuccess}
					onCancel={handleFormCancel}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-brand-900">
					Lista de ecos
				</h2>
				<button
					onClick={handleNew}
					className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800"
				>
					+ Nuevo eco
				</button>
			</div>

			{isLoading ? (
				<div className="text-center py-8 text-brand-600">
					Cargando ecos...
				</div>
			) : ecos.length === 0 ? (
				<div className="rounded-lg border border-brand-200 bg-paper p-8 text-center">
					<p className="text-brand-600">No hay ecos registrados.</p>
				</div>
			) : (
				<div className="rounded-lg border border-brand-200 bg-paper overflow-hidden">
					<table className="w-full">
						<thead className="bg-brand-50">
							<tr>
								<th className="px-4 py-3 text-left text-sm font-semibold text-brand-900">
									Nombre
								</th>
								<th className="px-4 py-3 text-left text-sm font-semibold text-brand-900">
									Precio
								</th>
								<th className="px-4 py-3 text-left text-sm font-semibold text-brand-900">
									Duración
								</th>
								<th className="px-4 py-3 text-left text-sm font-semibold text-brand-900">
									Estado
								</th>
								<th className="px-4 py-3 text-right text-sm font-semibold text-brand-900">
									Acciones
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-brand-100">
							{ecos.map((eco) => (
								<tr key={eco.id_eco} className="hover:bg-brand-50">
									<td className="px-4 py-3 text-sm text-brand-700">
										{eco.nombre}
									</td>
									<td className="px-4 py-3 text-sm text-brand-700">
										{formatPrecio(eco.precio)}
									</td>
									<td className="px-4 py-3 text-sm text-brand-700">
										{eco.duracion_min} min
									</td>
									<td className="px-4 py-3 text-sm">
										<span
											className={`rounded-full px-2 py-0.5 text-xs font-medium ${
												eco.activo === 1
													? "bg-green-100 text-green-700"
													: "bg-red-100 text-red-700"
											}`}
										>
											{eco.activo === 1 ? "Activo" : "Inactivo"}
										</span>
									</td>
									<td className="px-4 py-3 text-right">
										<div className="flex justify-end gap-2">
											<button
												onClick={() => handleEdit(eco)}
												className="rounded-lg border border-brand-300 bg-paper px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
											>
												Editar
											</button>
											<button
												onClick={() => handleDelete(eco.id_eco, eco.nombre)}
												disabled={isDeleting}
												className="rounded-lg border border-red-500 bg-paper px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
											>
												Eliminar
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

export default EcosList;
