import { useState, useMemo } from "react";
import { Plus, Search, Building2, TrendingUp, Package, ChevronLeft, ChevronRight, Trash2, PackagePlus } from "lucide-react";
import Swal from "sweetalert2";
import { useGetProveedoresQuery, useUpdateProveedorMutation, useDeleteProveedorMutation } from "../api";
import type { Proveedor } from "../api";
import CrearProveedorModal from "../components/CrearProveedorModal";
import CatalogoProveedorModal from "../components/CatalogoProveedorModal";

/* ── Componente ────────────────────────────────────── */
export default function ProveedoresPage() {
	const { data: proveedores = [], isLoading } = useGetProveedoresQuery();
	const [updateProveedor] = useUpdateProveedorMutation();
	const [deleteProveedor] = useDeleteProveedorMutation();
	const [searchQuery, setSearchQuery] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [showCrearModal, setShowCrearModal] = useState(false);
	const [catalogoProveedorActivo, setCatalogoProveedorActivo] = useState<Proveedor | null>(null);
	const itemsPerPage = 10;

	/* ── Filtrado y paginación ── */
	const filteredProveedores = useMemo(() => {
		if (!searchQuery.trim()) return proveedores;
		const q = searchQuery.toLowerCase();
		return proveedores.filter(
			(p) =>
				p.nombre.toLowerCase().includes(q) ||
				(p.rif || "").toLowerCase().includes(q) ||
				(p.contacto_nombre || "").toLowerCase().includes(q),
		);
	}, [proveedores, searchQuery]);

	const totalPages = Math.ceil(filteredProveedores.length / itemsPerPage);
	const currentProveedores = filteredProveedores.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage,
	);

	const activos = proveedores.filter((p) => p.activo === 1).length;

	/* ── Helpers UI ── */
	const getInitials = (name: string) =>
		name
			.split(" ")
			.map((w) => w[0])
			.join("")
			.substring(0, 2)
			.toUpperCase();

	const initialsColors = [
		"bg-teal-600 text-white",
		"bg-red-400 text-white",
		"bg-amber-500 text-white",
		"bg-indigo-500 text-white",
	];

	/* ── CRUD Handlers ── */
	const handleCrear = () => {
		setShowCrearModal(true);
	};

	const handleToggleActivo = async (prov: Proveedor) => {
		const action = prov.activo ? "desactivar" : "activar";
		const result = await Swal.fire({
			title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} proveedor?`,
			text: `${prov.nombre}`,
			icon: "question",
			showCancelButton: true,
			confirmButtonColor: "#0d9488",
			confirmButtonText: `Sí, ${action}`,
			cancelButtonText: "Cancelar",
		});
		if (result.isConfirmed) {
			try {
				await updateProveedor({ id: prov.id_proveedor, payload: { activo: prov.activo ? 0 : 1 } }).unwrap();
				Swal.fire({ icon: "success", title: `Proveedor ${action === "activar" ? "activado" : "desactivado"}`, timer: 1500, showConfirmButton: false });
			} catch (err: any) {
				Swal.fire({ icon: "error", title: "Error", text: err?.data?.message || "No se pudo actualizar" });
			}
		}
	};

	const handleEliminar = async (prov: Proveedor) => {
		const result = await Swal.fire({
			title: "¿Eliminar proveedor?",
			text: `${prov.nombre} — esta acción no se puede deshacer.`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#d33",
			confirmButtonText: "Sí, eliminar",
			cancelButtonText: "Cancelar",
		});
		if (result.isConfirmed) {
			try {
				await deleteProveedor(prov.id_proveedor).unwrap();
				Swal.fire({ icon: "success", title: "Proveedor eliminado", timer: 1500, showConfirmButton: false });
			} catch (err: any) {
				Swal.fire({ icon: "error", title: "Error", text: err?.data?.message || "No se pudo eliminar" });
			}
		}
	};

	/* ── Loading state ── */
	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-lg text-gray-500">Cargando proveedores...</div>
			</div>
		);
	}

	return (
		<div className="p-4 md:p-6 space-y-6">
			{/* ── Header ── */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold text-gray-900">
						Directorio de Proveedores
					</h1>
					<p className="text-gray-500 mt-1 text-base">
						Gestión centralizada de socios estratégicos y logística de suministros
						críticos para la red hospitalaria Garvis.
					</p>
				</div>
				<button
					onClick={handleCrear}
					className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm font-medium"
				>
					<Plus size={18} />
					Agregar Proveedor
				</button>
			</div>

			{/* ── Tarjetas resumen ── */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
					<div className="h-11 w-11 rounded-lg bg-teal-50 flex items-center justify-center">
						<Building2 className="h-5 w-5 text-teal-600" />
					</div>
					<div>
						<p className="text-base font-semibold text-gray-500 uppercase tracking-wider">Proveedores Activos</p>
						<p className="text-2xl font-bold text-gray-900">{activos}</p>
					</div>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
					<div className="h-11 w-11 rounded-lg bg-amber-50 flex items-center justify-center">
						<TrendingUp className="h-5 w-5 text-amber-600" />
					</div>
					<div>
						<p className="text-base font-semibold text-gray-500 uppercase tracking-wider">Total Registrados</p>
						<p className="text-2xl font-bold text-gray-900">{proveedores.length}</p>
					</div>
				</div>
				<div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
					<div className="h-11 w-11 rounded-lg bg-blue-50 flex items-center justify-center">
						<Package className="h-5 w-5 text-blue-600" />
					</div>
					<div>
						<p className="text-base font-semibold text-gray-500 uppercase tracking-wider">Inactivos</p>
						<p className="text-2xl font-bold text-gray-900">{proveedores.length - activos}</p>
					</div>
				</div>
			</div>

			{/* ── Buscador ── */}
			<div className="bg-white rounded-xl border border-gray-200 p-4">
				<div className="flex flex-col sm:flex-row gap-3">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
						<input
							type="text"
							placeholder="Buscar por razón social o RIF..."
							value={searchQuery}
							onChange={(e) => {
								setSearchQuery(e.target.value);
								setCurrentPage(1);
							}}
							className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
						/>
					</div>
				</div>
			</div>

			{/* ── Tabla ── */}
			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-base">
						<thead>
							<tr className="bg-gray-50 border-b border-gray-200">
								<th className="text-left px-6 py-3 font-semibold text-gray-500 uppercase text-base tracking-wider">Razón Social</th>
								<th className="text-left px-6 py-3 font-semibold text-gray-500 uppercase text-base tracking-wider">RIF / ID Fiscal</th>
								<th className="text-left px-6 py-3 font-semibold text-gray-500 uppercase text-base tracking-wider">Teléfono</th>
								<th className="text-left px-6 py-3 font-semibold text-gray-500 uppercase text-base tracking-wider">Estado</th>
								<th className="text-right px-6 py-3 font-semibold text-gray-500 uppercase text-base tracking-wider">Acciones</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{currentProveedores.length === 0 && (
								<tr>
									<td colSpan={5} className="px-6 py-8 text-center text-gray-400">
										No se encontraron proveedores
									</td>
								</tr>
							)}
							{currentProveedores.map((prov, idx) => (
								<tr key={prov.id_proveedor} className="hover:bg-gray-50 transition-colors">
									<td className="px-6 py-4">
										<div className="flex items-center gap-3">
											<span className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-base font-bold ${initialsColors[idx % initialsColors.length]}`}>
												{getInitials(prov.nombre)}
											</span>
											<div>
												<p className="font-semibold text-gray-900">{prov.nombre}</p>
												<p className="text-base text-gray-500">{prov.contacto_nombre || "Sin contacto"}</p>
											</div>
										</div>
									</td>
									<td className="px-6 py-4 text-gray-700">{prov.rif || "—"}</td>
									<td className="px-6 py-4 text-gray-700">{prov.telefono || "—"}</td>
									<td className="px-6 py-4">
										<button
											onClick={() => handleToggleActivo(prov)}
											className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-base font-medium cursor-pointer ${prov.activo ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
										>
											{prov.activo ? "Activo" : "Inactivo"}
										</button>
									</td>
									<td className="px-6 py-4 text-right">
										<div className="flex justify-end gap-2">
											<button
												onClick={() => setCatalogoProveedorActivo(prov)}
												className="text-teal-600 hover:text-teal-800 p-1.5 rounded hover:bg-teal-50 transition-colors"
												title="Ver/Agregar Productos (Catálogo)"
											>
												<PackagePlus className="h-4 w-4" />
											</button>
											<button
												onClick={() => handleEliminar(prov)}
												className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
												title="Eliminar"
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

				{/* ── Paginación ── */}
				{filteredProveedores.length > 0 && (
					<div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 text-base text-gray-500">
						<span>Mostrando {currentProveedores.length} de {filteredProveedores.length} proveedores</span>
						<div className="flex items-center gap-1">
							<button
								disabled={currentPage <= 1}
								onClick={() => setCurrentPage((p) => p - 1)}
								className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40"
							>
								<ChevronLeft className="h-4 w-4" />
							</button>
							{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
								<button
									key={page}
									onClick={() => setCurrentPage(page)}
									className={`px-2.5 py-1 rounded font-medium ${page === currentPage ? "bg-teal-600 text-white" : "hover:bg-gray-200 text-gray-700"}`}
								>
									{page}
								</button>
							))}
							<button
								disabled={currentPage >= totalPages}
								onClick={() => setCurrentPage((p) => p + 1)}
								className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40"
							>
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>
					</div>
				)}
			</div>

			<CrearProveedorModal
				isOpen={showCrearModal}
				onClose={() => setShowCrearModal(false)}
			/>

			<CatalogoProveedorModal
				isOpen={!!catalogoProveedorActivo}
				onClose={() => setCatalogoProveedorActivo(null)}
				proveedor={catalogoProveedorActivo}
			/>
		</div>
	);
}
