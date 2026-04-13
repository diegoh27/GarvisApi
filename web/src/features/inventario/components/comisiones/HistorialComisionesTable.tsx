import GenericTable from "../GenericTable";
import { formatFechaCortaLocal } from "../../../../shared";
import { Trash2, FileDown } from "lucide-react";
import type { EspecialistaComision } from "../../api/comisionesApi";
import { generateTableReport } from "../../../../utils/generateTableReport";
import Pagination from "../Pagination";

interface HistorialComisionesTableProps {
  comisiones: EspecialistaComision[];
  isLoading: boolean;
  onEliminar?: (idComision: string) => void;
  paginationInfo?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    label: string;
    onPageChange: (page: number) => void;
  };
}

export default function HistorialComisionesTable({
  comisiones,
  isLoading,
  onEliminar,
  paginationInfo,
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
      key: "rif",
      header: "RIF",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EspecialistaComision) => row.paciente_rif || "-",
    },
    {
      key: "fecha_cita",
      header: "Fecha Cita",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EspecialistaComision) =>
        row.fecha_cita ? formatFechaCortaLocal(row.fecha_cita) : "-",
    },
    {
      key: "fecha_pago",
      header: "Fecha Pago",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EspecialistaComision) =>
        row.fecha_pago ? formatFechaCortaLocal(row.fecha_pago) : "-",
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
    ...(onEliminar
      ? [
          {
            key: "actions",
            header: "Acciones",
            headerClassName:
              "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium text-gray-700",
            cellClassName: "px-3 md:px-6 py-4 text-center",
            render: (row: EspecialistaComision) => (
              <button
                type="button"
                onClick={() => onEliminar(row.id_comision)}
                className="text-red-600 hover:text-red-800 transition-colors p-1 inline-flex items-center justify-center"
                title="Eliminar pago"
              >
                <Trash2 size={18} />
              </button>
            ),
          },
        ]
      : []),
  ];

  const handleDownloadReport = () => {
    const validColumns = columns.filter(c => c.key !== "actions");
    const headers = validColumns.map(c => c.header);
    
    const tableData = comisiones.map((row, index) => {
      return validColumns.map((c) => {
        const val = c.render(row, index);
        return typeof val === "string" || typeof val === "number" ? val : "-";
      });
    });

    const suma = comisiones.reduce((acc, current) => acc + Number(current.monto || 0), 0);

    generateTableReport({
      title: "HISTORIAL PAGOS A ESPECIALISTAS",
      subtitle: `Fecha: ${new Date().toLocaleDateString("es-VE")}`,
      reportInfo: [
        { label: "Total Registros", value: comisiones.length.toString() },
      ],
      tableHeaders: headers,
      tableData,
      total: `$${suma.toFixed(2)}`,
      filename: `Historial_Especialistas_${new Date().getTime()}.pdf`
    });
  };

  return (
    <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
      <div className="px-4 md:px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-gray-800">
          Historial de pagos
        </h2>
        {comisiones.length > 0 && (
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
          >
            <FileDown size={18} />
            Descargar Reporte
          </button>
        )}
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
      {paginationInfo && <Pagination {...paginationInfo} />}
    </div>
  );
}
