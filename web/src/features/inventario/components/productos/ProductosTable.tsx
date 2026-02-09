import { Edit2, History, Pencil, ShoppingCart } from "lucide-react";
import type { Producto } from "../../api";
import GenericTable from "../GenericTable";

type ProductosTableProps = {
  productos: Producto[];
  startIndex: number;
  onEditar: (id: string) => void;
  onComprar: (id: string) => void;
  onCambiarCantidad: (id: string) => void;
  onVerHistorial: (id: string) => void;
};

export default function ProductosTable({
  productos,
  startIndex,
  onEditar,
  onComprar,
  onCambiarCantidad,
  onVerHistorial,
}: ProductosTableProps) {
  const columns = [
    {
      key: "id",
      header: "ID",
      headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (_row: Producto, index: number) =>
        String(startIndex + index + 1).padStart(3, "0"),
    },
    {
      key: "nombre",
      header: "Nombre",
      headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
      render: (row: Producto) => row.nombre,
    },
    {
      key: "cant",
      header: "Cant",
      headerClassName: "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-center font-semibold",
      render: (row: Producto) => row.stock_actual,
    },
    {
      key: "estado",
      header: "Estado",
      headerClassName: "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-center",
      render: (row: Producto) =>
        row.activo === 1 ? (
          <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Activo
          </span>
        ) : (
          <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Inactivo
          </span>
        ),
    },
    {
      key: "config",
      header: "Config",
      headerClassName: "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium",
      cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-center",
      render: (row: Producto) => (
        <div className="flex gap-1 md:gap-2 justify-center">
          <button
            onClick={() => onEditar(row.id_producto)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-gray-100 text-gray-600 transition-colors"
            title="Editar producto"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onComprar(row.id_producto)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-blue-100 text-blue-600 transition-colors"
            title="Comprar"
          >
            <ShoppingCart size={16} />
          </button>
          <button
            onClick={() => onCambiarCantidad(row.id_producto)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-teal-100 text-teal-600 transition-colors"
            title="Cambiar cantidad"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onVerHistorial(row.id_producto)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-purple-100 text-purple-600 transition-colors"
            title="Historial de compras"
          >
            <History size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto max-w-full">
        <GenericTable
          columns={columns}
          rows={productos}
          rowKey={(row) => row.id_producto}
          tableClassName="w-full min-w-full text-sm"
          theadClassName="bg-teal-500 text-white"
          getRowClassName={(_row, index) => (index % 2 === 0 ? "bg-gray-50" : "bg-white")}
          emptyState="No hay productos registrados"
        />
      </div>
    </div>
  );
}
