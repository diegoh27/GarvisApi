import GenericTable from "../GenericTable";
import type { EspecialistaComision } from "../../api/comisionesApi";

interface HistorialComisionesTableProps {
  comisiones: EspecialistaComision[];
  isLoading: boolean;
}

export default function HistorialComisionesTable({
  comisiones,
  isLoading,
}: HistorialComisionesTableProps) {
  const columns = [
    {
      key: "id",
      header: "ID",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
      cellClassName:
        "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900 font-mono",
      render: (_row: EspecialistaComision, index: number) =>
        String(index + 1).padStart(3, "0"),
    },
    {
      key: "especialista",
      header: "Especialista",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EspecialistaComision) =>
        `${row.especialista_nombre} ${row.especialista_apellido || ""}`.trim(),
    },
    {
      key: "eco",
      header: "Eco",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EspecialistaComision) => row.eco_nombre || "-",
    },
    {
      key: "fecha_cita",
      header: "Fecha Cita",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EspecialistaComision) =>
        row.fecha_cita
          ? new Date(row.fecha_cita).toLocaleDateString("es-ES", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
          : "-",
    },
    {
      key: "fecha_pago",
      header: "Fecha Pago",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EspecialistaComision) =>
        row.fecha_pago
          ? new Date(row.fecha_pago).toLocaleDateString("es-ES", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
          : "-",
    },
    {
      key: "monto",
      header: "Monto (USD)",
      headerClassName:
        "px-3 md:px-6 py-3 text-right text-xs md:text-sm font-medium text-gray-700",
      cellClassName:
        "px-3 md:px-6 py-4 text-xs md:text-sm text-right font-semibold text-gray-900",
      render: (row: EspecialistaComision) =>
        `$${Number(row.monto).toFixed(2)}`,
    },
    {
      key: "porcentaje",
      header: "%",
      headerClassName:
        "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium text-gray-700",
      cellClassName:
        "px-3 md:px-6 py-4 text-xs md:text-sm text-center text-gray-900",
      render: (row: EspecialistaComision) =>
        `${Number(row.porcentaje).toFixed(1)}%`,
    },
  ];

  return (
    <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-4 md:px-6 py-4 bg-gray-50 border-b">
        <h2 className="text-lg md:text-xl font-semibold text-gray-800">
          Historial de pagos
        </h2>
      </div>
      <div className="overflow-x-auto max-w-full">
        <GenericTable<EspecialistaComision>
          columns={columns}
          rows={comisiones}
          rowKey={(row) => row.id_comision}
          tableClassName="w-full min-w-[720px] text-sm"
          theadClassName="bg-gray-100"
          getRowClassName={(_row, index) =>
            index % 2 === 0 ? "bg-gray-50" : "bg-white"
          }
          isLoading={isLoading}
          loadingState="Cargando historial..."
          emptyState="No hay pagos registrados"
        />
      </div>
    </div>
  );
}
