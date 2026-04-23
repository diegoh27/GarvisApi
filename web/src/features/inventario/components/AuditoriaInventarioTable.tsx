import { useState, useMemo, useEffect } from "react";
import GenericTable from "./GenericTable";
import Pagination from "./Pagination";
import { useGetInventarioAuditoriaQuery } from "../api/inventarioAuditoriaApi";
import { formatFechaHoraLocal } from "../../../shared";

type TabType =
	| "productos"
	| "entes"
	| "nomina"
	| "alquiler"
	| "comisiones"
	| "facturacion";

type AuditoriaInventarioTableProps = {
	modulo: TabType;
};

const MODULO_LABELS: Record<string, string> = {
	productos: "Productos",
	entes: "Entes Legales",
	nomina: "Nómina",
	alquiler: "Alquiler",
	comisiones: "Comisiones",
	facturacion: "Facturación",
};

const ROL_LABELS: Record<string, string> = {
	admin: "Admin",
	moderador: "Moderador",
};

function formatModulo(modulo: string | null): string {
	if (!modulo) return "—";
	return MODULO_LABELS[modulo] ?? modulo;
}

function formatRol(rol: string | null): string {
	if (!rol) return "—";
	return ROL_LABELS[rol] ?? rol;
}

const ITEMS_PER_PAGE = 10;

export default function AuditoriaInventarioTable({ modulo }: AuditoriaInventarioTableProps) {
	const [currentPage, setCurrentPage] = useState(1);
	const offset = useMemo(
		() => (currentPage - 1) * ITEMS_PER_PAGE,
		[currentPage],
	);

	// Reset a página 1 al cambiar de pestaña
	useEffect(() => {
		setCurrentPage(1);
	}, [modulo]);

	const { data, isLoading } = useGetInventarioAuditoriaQuery({
		modulo,
		limit: ITEMS_PER_PAGE,
		offset,
	});

	const auditoria = data?.rows ?? [];
	const totalItems = data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

	const columns = [
		{
			key: "fecha",
			header: "Fecha",
			headerClassName:
				"px-3 md:px-6 py-3 text-left text-base md:text-base font-medium text-gray-700",
			cellClassName: "px-3 md:px-6 py-3 text-base md:text-base text-gray-900",
			render: (row: { fecha: string }) =>
				formatFechaHoraLocal(row.fecha) ?? "—",
		},
		// Módulo solo si no estamos filtrando (redundante cuando ya filtramos por pestaña)
		...(modulo
			? []
			: [
				{
					key: "modulo" as const,
					header: "Módulo",
					headerClassName:
						"px-3 md:px-6 py-3 text-left text-base md:text-base font-medium text-gray-700",
					cellClassName: "px-3 md:px-6 py-3 text-base md:text-base text-gray-900",
					render: (row: { modulo: string | null }) => formatModulo(row.modulo),
				},
			]),
		{
			key: "accion",
			header: "Acción",
			headerClassName:
				"px-3 md:px-6 py-3 text-left text-base md:text-base font-medium text-gray-700",
			cellClassName:
				"px-3 md:px-6 py-3 text-base md:text-base text-gray-900 min-w-[200px]",
			render: (row: { accion: string }) => (
				<span title={row.accion || undefined}>{row.accion || "—"}</span>
			),
		},
		{
			key: "usuario",
			header: "Usuario",
			headerClassName:
				"px-3 md:px-6 py-3 text-left text-base md:text-base font-medium text-gray-700",
			cellClassName: "px-3 md:px-6 py-3 text-base md:text-base text-gray-900",
			render: (row: {
				usuario_nombre: string | null;
				usuario_rol: string | null;
			}) => {
				const nombre = row.usuario_nombre || "—";
				const rol = formatRol(row.usuario_rol);
				return (
					<span title={`${nombre} (${rol})`}>
						{nombre}
						{rol !== "—" && (
							<span className="text-gray-500 text-base ml-1">({rol})</span>
						)}
					</span>
				);
			},
		},
	];

	return (
		<div className="mt-8 bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
			<div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
				<h3 className="text-base font-semibold text-gray-800">
					Registro de auditoría – Inventario
				</h3>
				<p className="text-base text-gray-600 mt-0.5">
					Historial de acciones realizadas en {MODULO_LABELS[modulo] ?? modulo}
				</p>
			</div>
			<div className="overflow-x-auto">
				<GenericTable
					columns={columns}
					rows={auditoria}
					rowKey={(row, i) => String((row as { id: number }).id ?? i)}
					tableClassName="min-w-full divide-y divide-gray-200"
					theadClassName="bg-gray-50"
					isLoading={isLoading}
					loadingState="Cargando auditoría..."
					emptyState="No hay registros de auditoría"
					getRowClassName={() =>
						"hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
					}
				/>
			</div>
			{!isLoading && totalItems > 0 && (
				<Pagination
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={totalItems}
					itemsPerPage={ITEMS_PER_PAGE}
					label="registros"
					onPageChange={setCurrentPage}
				/>
			)}
		</div>
	);
}
