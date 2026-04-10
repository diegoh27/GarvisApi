import { Pencil, Trash2 } from "lucide-react";
import GenericTable from "../GenericTable";
import Pagination from "../Pagination";
import type { EnteLegal } from "../../api";

interface EntesLegalesTableSimpleProps {
  entes: EnteLegal[];
  startIndex: number;
  onEditar: (id: string) => void;
  onEliminar: (id: string) => void;
  paginationInfo?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    label: string;
    onPageChange: (page: number) => void;
  };
}

export default function EntesLegalesTableSimple({
  entes,
  startIndex,
  onEditar,
  onEliminar,
  paginationInfo,
}: EntesLegalesTableSimpleProps) {
  const columns = [
    {
      key: "id_ente",
      header: "ID",
      headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium",
      cellClassName:
        "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900 font-mono",
      render: (_row: EnteLegal, index: number) =>
        String(startIndex + index + 1).padStart(3, "0"),
    },
    {
      key: "nombre",
      header: "Nombre",
      headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: EnteLegal) => row.nombre,
    },
    {
      key: "cant_obligaciones",
      header: "Obligaciones",
      headerClassName: "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900 text-center",
      render: (row: EnteLegal) => (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">
          {row.cant_obligaciones}
        </span>
      ),
    },
    {
      key: "activo",
      header: "Estado",
      headerClassName: "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-center",
      render: (row: EnteLegal) => (
        <span
          className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${row.activo
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-800"
            }`}
        >
          {row.activo ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      headerClassName: "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-center",
      render: (row: EnteLegal) => (
        <div className="flex gap-1 md:gap-2 justify-center">
          <button
            onClick={() => onEditar(row.id_ente)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-blue-100 text-blue-600 transition-colors"
            title="Editar"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onEliminar(row.id_ente)}
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
        <GenericTable<EnteLegal>
          columns={columns}
          rows={entes}
          rowKey={(row) => row.id_ente}
          tableClassName="w-full min-w-full text-sm"
          theadClassName="bg-teal-500 text-white"
          getRowClassName={(_row, index) => (index % 2 === 0 ? "bg-gray-50" : "bg-white")}
          emptyState="No hay entes legales registrados"
        />
      </div>
      {paginationInfo && <Pagination {...paginationInfo} />}
    </div>
  );
}
