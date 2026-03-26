import { Edit2, History, Pencil, ShoppingCart, Trash2 } from "lucide-react";
import type { Producto } from "../../api";
import GenericTable from "../GenericTable";

type ProductosTableProps = {
  productos: Producto[];
  startIndex: number;
  onEditar: (id: string) => void;
  onComprar: (id: string) => void;
  onCambiarCantidad: (id: string) => void;
  onVerHistorial: (id: string) => void;
  onEliminar: (id: string, nombre: string) => void;
};

export default function ProductosTable({
  productos,
  startIndex,
  onEditar,
  onComprar,
  onCambiarCantidad,
  onVerHistorial,
  onEliminar,
}: ProductosTableProps) {
  const columns = [
    {
      key: "id",
      header: "ID",
      headerClassName: "px-3 md:px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
      cellClassName: "px-3 md:px-6 py-5 text-sm font-medium text-gray-400 whitespace-nowrap",
      render: (_row: Producto, index: number) =>
        `#INV-${String(startIndex + index + 1).padStart(4, "0")}`,
    },
    {
      key: "nombre",
      header: "PRODUCT NAME",
      headerClassName: "px-3 md:px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
      cellClassName: "px-3 md:px-6 py-5 whitespace-nowrap",
      render: (row: Producto) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-800">{row.nombre}</span>
          <span className="text-xs text-gray-400 mt-0.5">
            {row.presentacion ? `${row.presentacion} (${Number(row.contenido)} ${row.unidad_medida || "uds"})` : "—"}
          </span>
        </div>
      ),
    },
    {
      key: "categoria",
      header: "CATEGORY",
      headerClassName: "px-3 md:px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
      cellClassName: "px-3 md:px-6 py-5 whitespace-nowrap",
      render: (row: Producto) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-100/50">
          {row.categoria || "General"}
        </span>
      ),
    },
    {
      key: "cant",
      header: "STOCK ACTUAL",
      headerClassName: "px-3 md:px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
      cellClassName: "px-3 md:px-6 py-5 text-sm text-center font-bold text-gray-800",
      render: (row: Producto) => Number(row.stock_actual),
    },
    {
      key: "consumo",
      header: "CONSUMO",
      headerClassName: "px-3 md:px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0 min-w-[150px]",
      cellClassName: "px-3 md:px-6 py-5",
      render: (row: Producto) => {
        const consumoNum = Number(row.consumo_actual) || 0;
        const contenidoNum = Number(row.contenido) || 1;
        const percentage = Math.min(Math.round((consumoNum / contenidoNum) * 100), 100);
        
        return (
          <div className="flex flex-col w-full min-w-[120px]">
            <div className="flex justify-between items-center mb-1 text-[10px] font-semibold text-gray-500">
              <span>{consumoNum}{row.unidad_medida || 'u'} / {contenidoNum}{row.unidad_medida || 'u'}</span>
              <span>{percentage}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-1.5 rounded-full ${percentage > 80 ? 'bg-red-400' : 'bg-teal-600'}`} 
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        );
      },
    },
    {
      key: "estado",
      header: "STATUS",
      headerClassName: "px-3 md:px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
      cellClassName: "px-3 md:px-6 py-5 whitespace-nowrap text-xs font-bold uppercase tracking-wide",
      render: (row: Producto) => {
        if (row.activo === 0) {
          return (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
              INACTIVE
            </div>
          );
        }
        
        if (Number(row.stock_actual) <= 5) {
           return (
            <div className="flex items-center gap-2 text-red-600">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
              LOW STOCK
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2 text-teal-600">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
            IN STOCK
          </div>
        );
      },
    },
    {
      key: "config",
      header: "CONFIG",
      headerClassName: "px-3 md:px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
      cellClassName: "px-3 md:px-6 py-5 text-center",
      render: (row: Producto) => (
        <div className="flex gap-1 md:gap-2 justify-center">
          <button
            onClick={() => onEditar(row.id_producto)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            title="Editar producto"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onComprar(row.id_producto)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors"
            title="Comprar"
          >
            <ShoppingCart size={15} />
          </button>
          <button
            onClick={() => onCambiarCantidad(row.id_producto)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-teal-50 text-teal-400 hover:text-teal-600 transition-colors"
            title="Ajuste Manual"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => onVerHistorial(row.id_producto)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-purple-50 text-purple-400 hover:text-purple-600 transition-colors"
            title="Historial de transacciones"
          >
            <History size={15} />
          </button>
          <button
            onClick={() => onEliminar(row.id_producto, row.nombre)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
            title="Eliminar producto"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-xl overflow-hidden">
      <div className="overflow-x-auto max-w-full">
        <GenericTable
          columns={columns}
          rows={productos}
          rowKey={(row) => row.id_producto}
          tableClassName="w-full min-w-full text-sm"
          theadClassName="bg-white border-b border-gray-100"
          getRowClassName={() => ("bg-white border-b border-gray-50 hover:bg-gray-50/50 transition-colors")}
          emptyState="No hay productos registrados"
        />
      </div>
    </div>
  );
}
