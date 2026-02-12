import GenericTable from "../GenericTable";
import type { EspecialistaInventario } from "../../api/especialistasApi";

interface EspecialistasTableProps {
  especialistas: EspecialistaInventario[];
  isLoading: boolean;
  startIndex: number;
}

export default function EspecialistasTable({
  especialistas,
  isLoading,
  startIndex,
}: EspecialistasTableProps) {
  const columns = [
    {
      key: "id",
      header: "ID",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
      cellClassName:
        "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900 font-mono",
      render: (_row: EspecialistaInventario, index: number) =>
        String(startIndex + index + 1).padStart(3, "0"),
    },
    {
      key: "nombre",
      header: "Nombre",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EspecialistaInventario) =>
        `${row.nombre} ${row.apellido}`,
    },
    {
      key: "especialidad",
      header: "Especialidad",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EspecialistaInventario) => row.especialidad || "-",
    },
    {
      key: "porcentaje",
      header: "Porcentaje de Comisión",
      headerClassName:
        "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium text-gray-700",
      cellClassName:
        "px-3 md:px-6 py-4 text-xs md:text-sm text-center text-gray-900 font-semibold",
      render: (row: EspecialistaInventario) =>
        row.porcentaje !== null && row.porcentaje !== undefined
          ? `${Number(row.porcentaje).toFixed(2)}%`
          : "-",
    },
  ];

  return (
    <GenericTable<EspecialistaInventario>
      columns={columns}
      rows={especialistas}
      rowKey={(row) => row.id_especialista}
      tableClassName="w-full min-w-full text-sm"
      theadClassName="bg-teal-500 text-white"
      getRowClassName={(_row, index) =>
        index % 2 === 0 ? "bg-gray-50" : "bg-white"
      }
      isLoading={isLoading}
      loadingState="Cargando especialistas..."
      emptyState="No hay especialistas registrados"
    />
  );
}
