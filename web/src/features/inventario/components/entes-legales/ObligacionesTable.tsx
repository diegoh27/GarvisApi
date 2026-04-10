import { Pencil, Trash2, DollarSign, History } from "lucide-react";
import GenericTable from "../GenericTable";
import Pagination from "../Pagination";
import type { Obligacion } from "../../api";

interface ObligacionesTableProps {
  obligaciones: Obligacion[];
  startIndex: number;
  onEditar: (id: string) => void;
  onEliminar: (id: string) => void;
  onGenerarPago?: (id: string) => void;
  onVerHistorial?: (id: string) => void;
  paginationInfo?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    label: string;
    onPageChange: (page: number) => void;
  };
}

export default function ObligacionesTable({
  obligaciones,
  startIndex,
  onEditar,
  onEliminar,
  onGenerarPago,
  onVerHistorial,
  paginationInfo,
}: ObligacionesTableProps) {
  const getEstadoBadge = (estado: string) => {
    const estadoLower = estado.toLowerCase();
    if (estadoLower === "pagado") {
      return (
        <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Pagado
        </span>
      );
    }
    if (estadoLower === "vencido") {
      return (
        <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Vencido
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
      key: "id_obligacion",
      header: "ID",
      headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium",
      cellClassName:
        "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900 font-mono",
      render: (_row: Obligacion, index: number) =>
        String(startIndex + index + 1).padStart(3, "0"),
    },
    {
      key: "nombre_ente",
      header: "Ente",
      headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: Obligacion) => row.nombre_ente,
    },
    {
      key: "concepto",
      header: "Concepto",
      headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: Obligacion) => row.concepto,
    },
    {
      key: "periodo",
      header: "Período",
      headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: Obligacion) => row.periodo,
    },
    {
      key: "estado",
      header: "Estado",
      headerClassName: "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-center",
      render: (row: Obligacion) => getEstadoBadge(row.estado),
    },
    {
      key: "fecha_vencimiento",
      header: "Fecha de vencimiento",
      headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: Obligacion) =>
        row.fecha_vencimiento !== null
          ? new Date(row.fecha_vencimiento).toLocaleDateString("es-VE")
          : <span className="text-gray-400 italic">Sin definir</span>,
    },
    {
      key: "acciones",
      header: "Acciones",
      headerClassName: "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-center",
      render: (row: Obligacion) => (
        <div className="flex gap-1 md:gap-2 justify-center flex-wrap">
          <button
            onClick={() => onEditar(row.id_obligacion)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-blue-100 text-blue-600 transition-colors"
            title="Editar"
          >
            <Pencil size={16} />
          </button>
          {onVerHistorial && (
            <button
              onClick={() => onVerHistorial(row.id_obligacion)}
              className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-purple-100 text-purple-600 transition-colors"
              title="Ver historial"
            >
              <History size={16} />
            </button>
          )}
          {onGenerarPago && (
            <button
              onClick={() => onGenerarPago(row.id_obligacion)}
              className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-emerald-100 text-emerald-600 transition-colors"
              title="Registrar pago"
            >
              <DollarSign size={16} />
            </button>
          )}
          <button
            onClick={() => onEliminar(row.id_obligacion)}
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
        <GenericTable<Obligacion>
          columns={columns}
          rows={obligaciones}
          rowKey={(row) => row.id_obligacion}
          tableClassName="w-full min-w-full text-sm"
          theadClassName="bg-teal-500 text-white"
          getRowClassName={(_row, index) => (index % 2 === 0 ? "bg-gray-50" : "bg-white")}
          emptyState="No hay obligaciones registradas"
        />
      </div>
      {paginationInfo && <Pagination {...paginationInfo} />}
    </div>
  );
}
