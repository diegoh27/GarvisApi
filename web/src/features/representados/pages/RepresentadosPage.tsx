import { useState, useEffect } from "react";
import { UserPlus, ChevronLeft, ChevronRight, Search, Pencil, Trash2 } from "lucide-react";
import PageShell from "../../../shared/components/PageShell";
import {
	useGetRepresentadosQuery,
	useGetParentescosQuery,
	useDeleteRepresentadoMutation,
	type Representado,
} from "../representadosApi";
import { CrearRepresentadoModal, EditarRepresentadoModal } from "../components";
import Swal from "sweetalert2";

const ITEMS_PER_PAGE = 5;
const GENEROS: Array<"Masculino" | "Femenino" | "Otro"> = [
	"Masculino",
	"Femenino",
	"Otro",
];

const formatFecha = (value: string) => {
	if (!value) return "—";
	const dateKey = value.includes("T") ? value.split("T")[0] : value.slice(0, 10);
	const date = new Date(`${dateKey}T00:00:00`);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString("es-VE", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
};

const RepresentadosPage = () => {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [filtroParentesco, setFiltroParentesco] = useState<string>("");
	const [filtroGenero, setFiltroGenero] = useState<string>("");
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [editingRepresentado, setEditingRepresentado] = useState<Representado | null>(null);

	const { data, isLoading } = useGetRepresentadosQuery({
		page,
		limit: ITEMS_PER_PAGE,
		search: search.trim() || undefined,
		parentesco: filtroParentesco || undefined,
		genero: filtroGenero || undefined,
	});

	const { data: parentescos = [] } = useGetParentescosQuery();
	const [deleteRepresentado, { isLoading: isDeleting }] = useDeleteRepresentadoMutation();

	const representados = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;

	useEffect(() => {
		setPage(1);
	}, [search, filtroParentesco, filtroGenero]);

	const handleDelete = async (representado: Representado) => {
		const result = await Swal.fire({
			title: "¿Eliminar representado?",
			text: `¿Está seguro de eliminar a ${representado.nombre} ${representado.apellido}? Esta acción no se puede deshacer.`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#d33",
			cancelButtonColor: "#3085d6",
			confirmButtonText: "Sí, eliminar",
			cancelButtonText: "Cancelar",
		});

		if (result.isConfirmed) {
			try {
				await deleteRepresentado(representado.id_representado).unwrap();
				await Swal.fire({
					icon: "success",
					title: "Eliminado",
					text: "El representado ha sido eliminado correctamente.",
					timer: 2000,
					showConfirmButton: false,
				});
			} catch (err: unknown) {
				const message =
					typeof err === "object" && err !== null && "data" in err
						? (err as { data?: { message?: string } }).data?.message
						: "No se pudo eliminar el representado";
				Swal.fire({
					icon: "error",
					title: "Error",
					text: message,
				});
			}
		}
	};

	return (
		<PageShell
			title="Mis representados"
			description="Gestiona las personas que representas (hijos, familiares, etc.) para agendar citas a su nombre."
		>
			<div className="space-y-6">
				{/* Barra: búsqueda, filtros, botón crear */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-wrap items-center gap-3">
						<div className="relative flex-1 min-w-[200px] max-w-xs">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
							<input
								type="search"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Buscar por nombre, apellido, cédula..."
								className="w-full rounded-lg border border-brand-300 bg-paper py-2 pl-9 pr-3 text-sm text-brand-900 placeholder:text-brand-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
							/>
						</div>
						<select
							value={filtroParentesco}
							onChange={(e) => setFiltroParentesco(e.target.value)}
							className="rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
						>
							<option value="">Todos los parentescos</option>
							{parentescos.map((p) => (
								<option key={p} value={p}>
									{p}
								</option>
							))}
						</select>
						<select
							value={filtroGenero}
							onChange={(e) => setFiltroGenero(e.target.value)}
							className="rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
						>
							<option value="">Todos los géneros</option>
							{GENEROS.map((g) => (
								<option key={g} value={g}>
									{g}
								</option>
							))}
						</select>
					</div>
					<button
						type="button"
						onClick={() => setIsCreateModalOpen(true)}
						className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper hover:bg-brand-800"
					>
						<UserPlus className="h-4 w-4" />
						Crear representado
					</button>
				</div>

				{/* Tabla / Cards responsive */}
				<div className="rounded-lg border border-brand-200 bg-paper overflow-hidden">
					{isLoading ? (
						<div className="p-8 text-center text-brand-600">
							Cargando representados...
						</div>
					) : representados.length === 0 ? (
						<div className="p-8 text-center text-brand-600">
							No hay representados. Use el botón &quot;Crear representado&quot; para agregar uno.
						</div>
					) : (
						<>
							{/* Vista de tabla (pantallas medianas y grandes) */}
							<div className="hidden md:block overflow-x-auto">
								<table className="w-full text-left text-sm">
									<thead className="border-b border-brand-200 bg-brand-50">
										<tr>
											<th className="px-4 py-3 font-medium text-brand-900">Nombre</th>
											<th className="px-4 py-3 font-medium text-brand-900">Apellido</th>
											<th className="px-4 py-3 font-medium text-brand-900">Cédula</th>
											<th className="px-4 py-3 font-medium text-brand-900">Fecha nac.</th>
											<th className="px-4 py-3 font-medium text-brand-900">Género</th>
											<th className="px-4 py-3 font-medium text-brand-900">Parentesco</th>
											<th className="px-4 py-3 font-medium text-brand-900 text-right">Acciones</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-brand-100">
										{representados.map((r: Representado) => (
											<tr key={r.id_representado} className="hover:bg-cloud/30">
												<td className="px-4 py-3 text-brand-900">{r.nombre}</td>
												<td className="px-4 py-3 text-brand-900">{r.apellido}</td>
												<td className="px-4 py-3 text-brand-800">{r.cedula ?? "—"}</td>
												<td className="px-4 py-3 text-brand-600">
													{formatFecha(r.fecha_nacimiento)}
												</td>
												<td className="px-4 py-3 text-brand-600">{r.genero}</td>
												<td className="px-4 py-3 text-brand-600">
													{r.parentesco ?? "—"}
												</td>
												<td className="px-4 py-3">
													<div className="flex items-center justify-end gap-2">
														<button
															type="button"
															onClick={() => setEditingRepresentado(r)}
															className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 transition-colors"
															title="Editar"
															disabled={isDeleting}
														>
															<Pencil className="h-4 w-4" />
														</button>
														<button
															type="button"
															onClick={() => handleDelete(r)}
															className="rounded-lg p-2 text-red-600 hover:bg-red-50 transition-colors"
															title="Eliminar"
															disabled={isDeleting}
														>
															<Trash2 className="h-4 w-4" />
														</button>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{/* Vista de cards (móviles) */}
							<div className="md:hidden divide-y divide-brand-100">
								{representados.map((r: Representado) => (
									<div
										key={r.id_representado}
										className="p-4 hover:bg-cloud/30 transition-colors"
									>
										<div className="space-y-3">
											<div className="flex justify-between items-start">
												<div>
													<h3 className="font-medium text-brand-900">
														{r.nombre} {r.apellido}
													</h3>
													<p className="text-sm text-brand-600">{r.cedula ?? "—"}</p>
												</div>
												{r.parentesco && (
													<span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-800">
														{r.parentesco}
													</span>
												)}
											</div>
											<div className="grid grid-cols-2 gap-2 text-sm">
												<div>
													<p className="text-brand-600">Fecha nac.</p>
													<p className="text-brand-900">
														{formatFecha(r.fecha_nacimiento)}
													</p>
												</div>
												<div>
													<p className="text-brand-600">Género</p>
													<p className="text-brand-900">{r.genero}</p>
												</div>
											</div>
											<div className="flex items-center gap-2 pt-1">
												<button
													type="button"
													onClick={() => setEditingRepresentado(r)}
													className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
													disabled={isDeleting}
												>
													<Pencil className="h-4 w-4" />
													Editar
												</button>
												<button
													type="button"
													onClick={() => handleDelete(r)}
													className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
													disabled={isDeleting}
												>
													<Trash2 className="h-4 w-4" />
													Eliminar
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						</>
					)}
				</div>

				{/* Paginación */}
				{totalPages > 1 && (
					<div className="flex items-center justify-between gap-4">
						<p className="text-sm text-brand-600">
							Mostrando {(page - 1) * ITEMS_PER_PAGE + 1}–
							{Math.min(page * ITEMS_PER_PAGE, total)} de {total}
						</p>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page <= 1}
								className="rounded-lg border border-brand-300 bg-paper p-2 text-brand-800 hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
								aria-label="Página anterior"
							>
								<ChevronLeft className="h-5 w-5" />
							</button>
							<span className="text-sm font-medium text-brand-800">
								Página {page} de {totalPages}
							</span>
							<button
								type="button"
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								disabled={page >= totalPages}
								className="rounded-lg border border-brand-300 bg-paper p-2 text-brand-800 hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
								aria-label="Página siguiente"
							>
								<ChevronRight className="h-5 w-5" />
							</button>
						</div>
					</div>
				)}
			</div>

			{isCreateModalOpen && (
				<CrearRepresentadoModal
					onClose={() => setIsCreateModalOpen(false)}
					onSuccess={() => setIsCreateModalOpen(false)}
				/>
			)}

			{editingRepresentado && (
				<EditarRepresentadoModal
					representado={editingRepresentado}
					onClose={() => setEditingRepresentado(null)}
					onSuccess={() => setEditingRepresentado(null)}
				/>
			)}
		</PageShell>
	);
};

export default RepresentadosPage;
