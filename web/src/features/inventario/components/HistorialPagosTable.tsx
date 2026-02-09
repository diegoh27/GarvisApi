import type { CompraProducto, HistorialEnteLegal } from "../api";
import GenericTable from "./GenericTable";

type HistorialRow = CompraProducto | HistorialEnteLegal;

type HistorialPagosTableProps = {
  historial: HistorialRow[];
  isLoading: boolean;
  variant?: "compras" | "pagos";
  title?: string;
  emptyMessage?: string;
};

export default function HistorialPagosTable({
  historial,
  isLoading,
  variant = "compras",
  title,
  emptyMessage,
}: HistorialPagosTableProps) {
  const isCompras = variant === "compras";

  const columns = isCompras
    ? [
      {
        key: "id",
        header: "ID",
        headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
        cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
        render: (row: HistorialRow) => {
          const compra = row as CompraProducto;
          return `${compra.id_compra.slice(0, 6)}...`;
        },
      },
      {
        key: "producto",
        header: "Producto",
        headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
        cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm font-medium text-gray-900",
        render: (row: HistorialRow) => (row as CompraProducto).nombre_producto,
      },
      {
        key: "fecha",
        header: "Fecha",
        headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
        cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
        render: (row: HistorialRow) =>
          new Date((row as CompraProducto).fecha_ingreso).toLocaleDateString("es-ES", {
            month: "short",
            day: "numeric",
          }),
      },
      {
        key: "cant",
        header: "Cant",
        headerClassName: "px-3 md:px-6 py-3 text-right text-xs md:text-sm font-medium text-gray-700",
        cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-right text-gray-900",
        render: (row: HistorialRow) => (row as CompraProducto).cantidad,
      },
      {
        key: "unit",
        header: "P.Unit.",
        headerClassName: "px-3 md:px-6 py-3 text-right text-xs md:text-sm font-medium text-gray-700",
        cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-right text-gray-900",
        render: (row: HistorialRow) => {
          const compra = row as CompraProducto;
          return `$${Number(compra.precio_unitario).toFixed(2)}`;
        },
      },
      {
        key: "total",
        header: "P.Total",
        headerClassName: "px-3 md:px-6 py-3 text-right text-xs md:text-sm font-medium text-gray-700",
        cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-right font-semibold text-gray-900",
        render: (row: HistorialRow) => {
          const compra = row as CompraProducto;
          return `$${Number(compra.precio_total).toFixed(2)}`;
        },
      },
      {
        key: "prov",
        header: "Prov.",
        headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
        cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
        render: (row: HistorialRow) => (row as CompraProducto).proveedor || "-",
      },
    ]
    : [
      {
        key: "id",
        header: "ID",
        headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
        cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
        render: (row: HistorialRow) => {
          const pago = row as HistorialEnteLegal;
          return pago.id_historial ? `${pago.id_historial.slice(0, 6)}...` : "-";
        },
      },
      {
        key: "ente",
        header: "Ente",
        headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
        cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm font-medium text-gray-900",
        render: (row: HistorialRow) => (row as HistorialEnteLegal).nombre_ente || "-",
      },
      {
        key: "concepto",
        header: "Concepto",
        headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
        cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm font-medium text-gray-900",
        render: (row: HistorialRow) => (row as HistorialEnteLegal).concepto || "-",
      },
      {
        key: "fecha",
        header: "Fecha",
        headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
        cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
        render: (row: HistorialRow) =>
          new Date((row as HistorialEnteLegal).fecha_ingreso).toLocaleDateString("es-ES", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
      },
      {
        key: "valor",
        header: "Valor",
        headerClassName: "px-3 md:px-6 py-3 text-right text-xs md:text-sm font-medium text-gray-700",
        cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-right text-gray-900",
        render: (row: HistorialRow) => {
          const pago = row as HistorialEnteLegal;
          return `$${Number(pago.precio_unitario).toFixed(2)}`;
        },
      },
      {
        key: "creado",
        header: "Registrado",
        headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
        cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
        render: (row: HistorialRow) =>
          new Date((row as HistorialEnteLegal).creado_en).toLocaleDateString("es-ES", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
      },
    ];

  const tableTitle = title || (isCompras ? "Historial de Compras" : "Historial de Pagos");
  const tableEmptyMessage =
    emptyMessage || (isCompras ? "No hay compras registradas" : "No hay pagos registrados");

  return (
    <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-4 md:px-6 py-4 bg-gray-50 border-b">
        <h2 className="text-lg md:text-xl font-semibold text-gray-800">{tableTitle}</h2>
      </div>
      <div className="overflow-x-auto max-w-full">
        <GenericTable
          columns={columns}
          rows={historial}
          rowKey={(row) =>
            isCompras
              ? (row as CompraProducto).id_compra
              : (row as HistorialEnteLegal).id_historial
          }
          tableClassName="w-full min-w-[720px] text-sm"
          theadClassName="bg-gray-100"
          getRowClassName={(_row, index) => (index % 2 === 0 ? "bg-gray-50" : "bg-white")}
          isLoading={isLoading}
          loadingState="Cargando historial..."
          emptyState={tableEmptyMessage}
        />
      </div>
    </div>
  );
}
