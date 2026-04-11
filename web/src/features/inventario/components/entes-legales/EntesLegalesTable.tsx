import { DollarSign, Pencil, Trash2 } from "lucide-react";
import GenericTable from "../GenericTable";
import type { EnteLegal } from "../../api";

interface EntesLegalesTableProps {
  entes: EnteLegal[];
  startIndex: number;
  onEditar: (id: string) => void;
  onEliminar: (id: string) => void;
  onGenerarPago?: (id: string) => void;
}

export default function EntesLegalesTable({
  entes,
  startIndex,
  onEditar,
  onEliminar,
  onGenerarPago,
}: EntesLegalesTableProps) {
  const columns = [
    {
      key: "id_ente",
      header: "ID",
      headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900 font-mono",
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
          className={`text-xs font-medium ${row.activo
              ? "text-emerald-600"
              : "text-gray-500"
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
          {onGenerarPago && (
            <button
              onClick={() => onGenerarPago(row.id_ente)}
              className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-emerald-100 text-emerald-600 transition-colors"
              title="Generar pago"
            >
              <DollarSign size={16} />
            </button>
          )}
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
    </div>
  );
}
