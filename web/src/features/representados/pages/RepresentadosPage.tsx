import { useState, useEffect } from "react";
import { UserPlus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import PageShell from "../../../shared/components/PageShell";
import {
	useGetRepresentadosQuery,
	useGetParentescosQuery,
	type Representado,
} from "../representadosApi";
import { CrearRepresentadoModal } from "../components";

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

	const { data, isLoading } = useGetRepresentadosQuery({
		page,
		limit: ITEMS_PER_PAGE,
		search: search.trim() || undefined,
		parentesco: filtroParentesco || undefined,
		genero: filtroGenero || undefined,
	});

	const { data: parentescos = [] } = useGetParentescosQuery();

	const representados = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = data?.totalPages ?? 1;

	useEffect(() => {
		setPage(1);
	}, [search, filtroParentesco, filtroGenero]);

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

				{/* Tabla */}
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
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead className="border-b border-brand-200 bg-brand-50">
									<tr>
										<th className="px-4 py-3 font-medium text-brand-900">Nombre</th>
										<th className="px-4 py-3 font-medium text-brand-900">Apellido</th>
										<th className="px-4 py-3 font-medium text-brand-900">Cédula</th>
										<th className="px-4 py-3 font-medium text-brand-900">Fecha nac.</th>
										<th className="px-4 py-3 font-medium text-brand-900">Género</th>
										<th className="px-4 py-3 font-medium text-brand-900">Parentesco</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-brand-100">
									{representados.map((r: Representado) => (
										<tr key={r.id_representado} className="hover:bg-cloud/30">
											<td className="px-4 py-3 text-brand-900">{r.nombre}</td>
											<td className="px-4 py-3 text-brand-900">{r.apellido}</td>
											<td className="px-4 py-3 text-brand-800">{r.cedula}</td>
											<td className="px-4 py-3 text-brand-600">
												{formatFecha(r.fecha_nacimiento)}
											</td>
											<td className="px-4 py-3 text-brand-600">{r.genero}</td>
											<td className="px-4 py-3 text-brand-600">
												{r.parentesco ?? "—"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
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
		</PageShell>
	);
};

export default RepresentadosPage;
