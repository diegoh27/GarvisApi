import { DollarSign, Pencil } from "lucide-react";
import GenericTable from "../GenericTable";
import Pagination from "../Pagination";
import { formatFechaLocal } from "../../../../shared";
import type { EspecialistaComision } from "../../api/comisionesApi";

interface ComisionesTableProps {
  comisiones: EspecialistaComision[];
  onPagar: (comision: EspecialistaComision) => void;
  onEditar: (comision: EspecialistaComision) => void;
  startIndex?: number;
  paginationInfo?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    label: string;
    onPageChange: (page: number) => void;
  };
}

export default function ComisionesTable({
  comisiones,
  onPagar,
  onEditar,
  startIndex = 0,
  paginationInfo,
}: ComisionesTableProps) {
  const getEstadoBadge = (estado: EspecialistaComision["estado"]) => {
    if (estado === "Pagada") {
      return (
        <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
          Pagada
        </span>
      );
    }
    return (
      <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Pendiente
      </span>
    );
  };

  const columns = [
    {
      key: "id",
      header: "ID",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-white",
      cellClassName:
        "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900 font-mono",
      render: (_row: EspecialistaComision, index: number) =>
        String(startIndex + index + 1).padStart(3, "0"),
    },
    {
      key: "especialista",
      header: "Especialista",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-white",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EspecialistaComision) =>
        `${row.especialista_nombre} ${row.especialista_apellido || ""}`.trim(),
    },
    {
      key: "paciente",
      header: "Paciente",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-white",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EspecialistaComision) => row.paciente_nombre || "-",
    },
    {
      key: "cedula",
      header: "Cédula",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-white",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EspecialistaComision) => row.paciente_cedula || "-",
    },
    {
      key: "rif",
      header: "RIF",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-white",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EspecialistaComision) => row.paciente_rif || "-",
    },
    {
      key: "especialidad",
      header: "Eco",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-white",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EspecialistaComision) => row.eco_nombre || "-",
    },
    {
      key: "monto",
      header: "Monto ($)",
      headerClassName:
        "px-3 md:px-6 py-3 text-right text-xs md:text-sm font-medium text-white",
      cellClassName:
        "px-3 md:px-6 py-4 text-xs md:text-sm text-right text-gray-900",
      render: (row: EspecialistaComision) =>
        `$${Number(row.monto).toFixed(2)}`,
    },
    {
      key: "porcentaje",
      header: "Porcentaje",
      headerClassName:
        "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium text-white",
      cellClassName:
        "px-3 md:px-6 py-4 text-xs md:text-sm text-center text-gray-900",
      render: (row: EspecialistaComision) =>
        `${Number(row.porcentaje).toFixed(1)}%`,
    },
    {
      key: "fecha_cita",
      header: "Fecha de Cita",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-white",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EspecialistaComision) =>
        row.fecha_cita ? formatFechaLocal(row.fecha_cita) : "-",
    },
    {
      key: "estado",
      header: "Estado",
      headerClassName:
        "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium text-white",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-center",
      render: (row: EspecialistaComision) => getEstadoBadge(row.estado),
    },
    {
      key: "acciones",
      header: "Acciones",
      headerClassName:
        "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium text-white",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-center",
      render: (row: EspecialistaComision) => (
        row.estado === "Pagada" ? (
          <button
            onClick={() => onEditar(row)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-slate-100 text-slate-600 transition-colors"
            title="Editar pago"
          >
            <Pencil size={16} />
          </button>
        ) : (
          <button
            onClick={() => onPagar(row)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-emerald-100 text-emerald-600 transition-colors"
            title="Pagar cita"
          >
            <DollarSign size={16} />
          </button>
        )
      ),
    },
  ];

  return (
    <>
      <GenericTable<EspecialistaComision>
        columns={columns}
        rows={comisiones}
        rowKey={(row) => row.id_comision}
        tableClassName="w-full min-w-full text-sm"
        theadClassName="bg-teal-500 text-white"
        getRowClassName={(_row, index) =>
          index % 2 === 0 ? "bg-gray-50" : "bg-white"
        }
        emptyState="No hay citas pendientes de pago"
      />
      {paginationInfo && <Pagination {...paginationInfo} />}
    </>
  );
}
