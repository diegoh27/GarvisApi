import { Edit2, Trash2, MinusCircle } from "lucide-react";
import type { Producto } from "../../api";
import GenericTable from "../GenericTable";

type ProductosTableProps = {
  productos: Producto[];
  startIndex: number;
  onEditar: (id: string) => void;
  onConsumoManual: (id: string) => void;
  onEliminar: (id: string, nombre: string) => void;
};

export default function ProductosTable({
  productos,
  startIndex,
  onEditar,
  onConsumoManual,
  onEliminar,
}: ProductosTableProps) {
  const columns = [
    {
      key: "id",
      header: "ID",
      headerClassName: "px-3 md:px-6 py-4 text-left text-base font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
      cellClassName: "px-3 md:px-6 py-5 text-base font-medium text-gray-400 whitespace-nowrap",
      render: (_row: Producto, index: number) =>
        `#INV-${String(startIndex + index + 1).padStart(4, "0")}`,
    },
    {
      key: "nombre",
      header: "PRODUCT NAME",
      headerClassName: "px-3 md:px-6 py-4 text-left text-base font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
      cellClassName: "px-3 md:px-6 py-5 whitespace-nowrap",
      render: (row: Producto) => (
        <div className="flex flex-col">
          <span className="text-base font-bold text-gray-800">{row.nombre}</span>
          <span className="text-base text-gray-400 mt-0.5">
            {row.presentacion ? `${row.presentacion} • ` : ""}
            1 {row.unidad_compra || "Caja"} = {Number(row.factor_conversion) || 1} {row.unidad_consumo || "u"}
          </span>
        </div>
      ),
    },
    {
      key: "categoria",
      header: "CATEGORY",
      headerClassName: "px-3 md:px-6 py-4 text-left text-base font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
      cellClassName: "px-3 md:px-6 py-5 whitespace-nowrap",
      render: (row: Producto) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-base font-medium bg-cyan-50 text-cyan-700 border border-cyan-100/50">
          {row.categoria || "General"}
        </span>
      ),
    },
    {
      key: "cant",
      header: "STOCK ACTUAL",
      headerClassName: "px-3 md:px-6 py-4 text-center text-base font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
      cellClassName: "px-3 md:px-6 py-5 text-base text-center font-bold text-gray-800",
      render: (row: Producto) => (
        <span>
          {Math.floor(Number(row.stock_base_total))}{" "}
          <span className="text-base text-gray-400 font-normal">
            {row.unidad_consumo || "u"}
          </span>
        </span>
      ),
    },
    {
      key: "consumo",
      header: "CONSUMO",
      headerClassName: "px-3 md:px-6 py-4 text-center text-base font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0 min-w-[150px]",
      cellClassName: "px-3 md:px-6 py-5 text-center",
      render: (row: Producto) => {
        const consumo = Number(row.consumo_actual) || 0;
        const fConv = Number(row.factor_conversion) || 1;
        const pct = fConv > 0 ? Math.min(Math.round((consumo / fConv) * 100), 100) : 0;
        const unidad = row.unidad_consumo || "u";
        const barColor = pct > 75 ? "bg-red-500" : pct > 40 ? "bg-amber-500" : "bg-teal-600";

        return (
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2 text-base text-gray-600">
              <span className="font-medium">
                {consumo}{unidad} / {fConv}{unidad}
              </span>
              <span className={`text-base font-bold ${pct > 75 ? "text-red-500" : pct > 40 ? "text-amber-500" : "text-gray-400"}`}>
                {pct}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "estado",
      header: "STATUS",
      headerClassName: "px-3 md:px-6 py-4 text-left text-base font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
      cellClassName: "px-3 md:px-6 py-5 whitespace-nowrap text-base font-bold uppercase tracking-wide",
      render: (row: Producto) => {
        if (row.activo === 0) {
          return (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
              INACTIVE
            </div>
          );
        }
        
        if (Number(row.stock_base_total) <= Number(row.stock_minimo_base)) {
           return (
            <div className="flex items-center gap-2 text-red-600">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
              Bajo Stock
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2 text-teal-600">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
            Disponible
          </div>
        );
      },
    },
    {
      key: "config",
      header: "CONFIG",
      headerClassName: "px-3 md:px-6 py-4 text-center text-base font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
      cellClassName: "px-3 md:px-6 py-5 text-center",
      render: (row: Producto) => (
        <div className="flex gap-1 md:gap-2 justify-center">
          <button
            onClick={() => onConsumoManual(row.id_producto)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-orange-50 text-orange-400 hover:text-orange-600 transition-colors"
            title="Consumo Manual"
          >
            <MinusCircle size={16} />
          </button>
          <button
            onClick={() => onEditar(row.id_producto)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-teal-50 text-teal-500 hover:text-teal-700 transition-colors"
            title="Editar producto"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onEliminar(row.id_producto, row.nombre)}
            className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
            title="Eliminar producto"
          >
            <Trash2 size={16} />
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
          tableClassName="w-full min-w-full text-base"
          theadClassName="bg-white border-b border-gray-100"
          getRowClassName={() => ("bg-white border-b border-gray-50 hover:bg-gray-50/50 transition-colors")}
          emptyState="No hay productos registrados"
        />
      </div>
    </div>
  );
}
