import { DollarSign, Pencil, Trash2 } from "lucide-react";
import GenericTable from "../GenericTable";
import Pagination from "../Pagination";
import { formatFechaLocal } from "../../../../shared";
import type { AlquilerContrato } from "../../api/alquilerApi";

interface ContratosTableProps {
  contratos: AlquilerContrato[];
  startIndex: number;
  onEditar: (id: string) => void;
  onEliminar: (id: string) => void;
  onRegistrarPago: (id: string) => void;
  paginationInfo?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    label: string;
    onPageChange: (page: number) => void;
  };
}

export default function ContratosTable({
  contratos,
  startIndex,
  onEditar,
  onEliminar,
  onRegistrarPago,
  paginationInfo,
}: ContratosTableProps) {
  const getEstadoBadge = (estado: AlquilerContrato["estado"]) => {
    if (estado === "Pagado") {
      return (
        <span className="text-xs font-medium text-emerald-600">
          Pagado
        </span>
      );
    }
    if (estado === "Vencido") {
      return (
        <span className="text-xs font-medium text-red-600">
          Vencido
        </span>
      );
    }
    return (
      <span className="text-xs font-medium text-amber-500">
        Pendiente
      </span>
    );
  };

  const columns = [
    {
      key: "id",
      header: "ID",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium",
      cellClassName:
        "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900 font-mono",
      render: (_row: AlquilerContrato, index: number) =>
        String(startIndex + index + 1).padStart(3, "0"),
    },
    {
      key: "nombre",
      header: "Nombre",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: AlquilerContrato) => row.nombre,
    },
    {
      key: "periodo",
      header: "Período",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: AlquilerContrato) => row.periodo,
    },
    {
      key: "monto",
      header: "Monto ($)",
      headerClassName:
        "px-3 md:px-6 py-3 text-right text-xs md:text-sm font-medium",
      cellClassName:
        "px-3 md:px-6 py-4 text-xs md:text-sm text-right text-gray-900",
      render: (row: AlquilerContrato) => `$${Number(row.monto).toFixed(2)}`,
    },
    {
      key: "fecha_vencimiento",
      header: "Próx. Pago",
      headerClassName:
        "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: AlquilerContrato) =>
        row.fecha_vencimiento ? formatFechaLocal(row.fecha_vencimiento) : "-",
    },
    {
      key: "estado",
      header: "Estado",
      headerClassName:
        "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-center",
      render: (row: AlquilerContrato) => getEstadoBadge(row.estado),
    },
    {
      key: "acciones",
      header: "Acciones",
      headerClassName:
        "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-center",
      render: (row: AlquilerContrato) => (
        <div className="flex gap-1 md:gap-2 justify-center flex-wrap">
          <button
            onClick={() => onEditar(row.id_contrato)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-blue-100 text-blue-600 transition-colors"
            title="Editar"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onRegistrarPago(row.id_contrato)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-emerald-100 text-emerald-600 transition-colors"
            title="Registrar pago"
          >
            <DollarSign size={16} />
          </button>
          <button
            onClick={() => onEliminar(row.id_contrato)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-red-100 text-red-600 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto max-w-full">
        <GenericTable<AlquilerContrato>
          columns={columns}
          rows={contratos}
          rowKey={(row) => row.id_contrato}
          tableClassName="w-full min-w-full text-sm"
          theadClassName="bg-teal-500 text-white"
          getRowClassName={(_row, index) =>
            index % 2 === 0 ? "bg-gray-50" : "bg-white"
          }
          emptyState="No hay contratos registrados"
        />
      </div>
      {paginationInfo && <Pagination {...paginationInfo} />}
    </div>
  );
}
