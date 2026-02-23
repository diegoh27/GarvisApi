import { useState } from "react";
import Swal from "sweetalert2";
import {
	useGetEspecialidadesQuery,
	useDeleteEspecialidadMutation,
} from "../especialidadesApi";
import type { Especialidad } from "../especialidadesApi";
import EspecialidadForm from "./EspecialidadForm";

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

	if (showForm) {
		return (
			<div className="rounded-lg border border-brand-200 bg-paper p-6">
				<h2 className="mb-4 text-lg font-semibold text-brand-900">
					{editingEspecialidad
						? "Editar especialidad"
						: "Nueva especialidad"}
				</h2>
				<EspecialidadForm
					especialidad={editingEspecialidad}
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
					Lista de especialidades
				</h2>
				<button
					onClick={handleNew}
					className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800"
				>
					+ Nueva especialidad
				</button>
			</div>

			{isLoading ? (
				<div className="text-center py-8 text-brand-600">
					Cargando especialidades...
				</div>
			) : especialidades.length === 0 ? (
				<div className="rounded-lg border border-brand-200 bg-paper p-8 text-center">
					<p className="text-brand-600">No hay especialidades registradas.</p>
				</div>
			) : (
				<div className="rounded-lg border border-brand-200 bg-paper overflow-hidden">
					<table className="w-full">
						<thead className="bg-brand-50">
							<tr>
								<th className="px-4 py-3 text-left text-sm font-semibold text-brand-900">
									Nombre
								</th>
								<th className="px-4 py-3 text-right text-sm font-semibold text-brand-900">
									Acciones
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-brand-100">
							{especialidades.map((esp) => (
								<tr key={esp.id_especialidad} className="hover:bg-brand-50">
									<td className="px-4 py-3 text-sm text-brand-700">
										{esp.nombre}
									</td>
									<td className="px-4 py-3 text-right">
										<div className="flex justify-end gap-2">
											<button
												onClick={() => handleEdit(esp)}
												className="rounded-lg border border-brand-300 bg-paper px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
											>
												Editar
											</button>
											<button
												onClick={() => handleDelete(esp.id_especialidad, esp.nombre)}
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

export default EspecialidadesList;
