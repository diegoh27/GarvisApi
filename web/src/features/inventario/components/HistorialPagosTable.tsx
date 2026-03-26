import type { CompraProducto } from "../api/productosApi";
import type { HistorialEnteLegal } from "../api/entesLegalesApi";
import type { AlquilerPago } from "../api/alquilerApi";
import type { NominaPago } from "../api/nominaApi";
import GenericTable from "./GenericTable";
import { formatFechaLocal, formatFechaCortaLocal, formatFechaHoraLocal } from "../../../shared";
import { Edit, Trash2, FileDown } from "lucide-react";
import { generateTableReport } from "../../../utils/generateTableReport";

type HistorialRow =
  | CompraProducto
  | HistorialEnteLegal
  | NominaPago
  | AlquilerPago;

type HistorialPagosTableProps = {
  historial: HistorialRow[];
  isLoading: boolean;
  variant?: "compras" | "pagos" | "nomina" | "alquiler";
  title?: string;
  emptyMessage?: string;
  onEditar?: (row: HistorialRow) => void;
  onEliminar?: (id: string) => void;
};

export default function HistorialPagosTable({
  historial,
  isLoading,
  variant = "compras",
  title,
  emptyMessage,
  onEditar,
  onEliminar,
}: HistorialPagosTableProps) {
  const isCompras = variant === "compras";
  const isNomina = variant === "nomina";
  const isAlquiler = variant === "alquiler";

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
          formatFechaCortaLocal((row as CompraProducto).fecha_ingreso),
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
      ...(onEditar || onEliminar
        ? [
          {
            key: "actions",
            header: "Acciones",
            headerClassName:
              "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium text-gray-700",
            cellClassName: "px-3 md:px-6 py-4 text-center",
            render: (row: HistorialRow) => (
              <div className="flex gap-1 md:gap-2 justify-center flex-wrap">
                {onEditar && (
                  <button
                    onClick={() => onEditar(row)}
                    className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                    title="Editar compra"
                  >
                    <Edit size={18} />
                  </button>
                )}
                {onEliminar && (
                  <button
                    onClick={() => onEliminar((row as CompraProducto).id_compra)}
                    className="text-red-600 hover:text-red-800 transition-colors p-1"
                    title="Eliminar compra"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ),
          },
        ]
        : []),
    ]
    : isNomina
      ? [
        {
          key: "id_pago",
          header: "ID",
          headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
          cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
          render: (row: HistorialRow) => {
            const pago = row as NominaPago;
            return pago.id_pago ? `${pago.id_pago.slice(0, 8)}...` : "-";
          },
        },
        {
          key: "empleado",
          header: "Empleado",
          headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
          cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
          render: (row: HistorialRow) => {
            const pago = row as NominaPago;
            return `${pago.nombre_empleado} ${pago.apellido || ""}`;
          },
        },
        {
          key: "cargo",
          header: "Cargo",
          headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
          cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
          render: (row: HistorialRow) => (row as NominaPago).cargo || "-",
        },
        {
          key: "fecha_pago",
          header: "Fecha de Pago",
          headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
          cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
          render: (row: HistorialRow) =>
            formatFechaLocal((row as NominaPago).fecha_pago),
        },
        {
          key: "monto",
          header: "Monto ($)",
          headerClassName: "px-3 md:px-6 py-3 text-right text-xs md:text-sm font-medium text-gray-700",
          cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-right text-gray-900 font-semibold",
          render: (row: HistorialRow) => {
            const pago = row as NominaPago;
            return `$${Number(pago.monto).toFixed(2)}`;
          },
        },
        {
          key: "metodo",
          header: "Método",
          headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
          cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
          render: (row: HistorialRow) => {
            const pago = row as NominaPago;
            return pago.metodo.charAt(0).toUpperCase() + pago.metodo.slice(1);
          },
        },
        {
          key: "referencia",
          header: "Referencia",
          headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
          cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
          render: (row: HistorialRow) => (row as NominaPago).referencia || "-",
        },
        ...(onEditar || onEliminar
          ? [
            {
              key: "actions",
              header: "Acciones",
              headerClassName:
                "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium text-gray-700",
              cellClassName: "px-3 md:px-6 py-4 text-center",
              render: (row: HistorialRow) => (
                <div className="flex gap-1 md:gap-2 justify-center flex-wrap">
                  {onEditar && (
                    <button
                      onClick={() => onEditar(row)}
                      className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                      title="Editar pago"
                    >
                      <Edit size={18} />
                    </button>
                  )}
                  {onEliminar && (
                    <button
                      onClick={() => onEliminar((row as NominaPago).id_pago)}
                      className="text-red-600 hover:text-red-800 transition-colors p-1"
                      title="Eliminar pago"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ),
            },
          ]
          : []),
      ]
      : isAlquiler
        ? [
          {
            key: "id_pago",
            header: "ID",
            headerClassName:
              "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
            cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
            render: (row: HistorialRow) => {
              const pago = row as AlquilerPago;
              return pago.id_pago ? `${pago.id_pago.slice(0, 8)}...` : "-";
            },
          },
          {
            key: "contrato",
            header: "Contrato",
            headerClassName:
              "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
            cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
            render: (row: HistorialRow) => {
              const pago = row as AlquilerPago;
              return pago.nombre_contrato || pago.id_contrato || "-";
            },
          },
          {
            key: "fecha_pago",
            header: "Fecha de Pago",
            headerClassName:
              "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
            cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
            render: (row: HistorialRow) =>
              formatFechaLocal((row as AlquilerPago).fecha_pago),
          },
          {
            key: "monto",
            header: "Monto ($)",
            headerClassName:
              "px-3 md:px-6 py-3 text-right text-xs md:text-sm font-medium text-gray-700",
            cellClassName:
              "px-3 md:px-6 py-4 text-xs md:text-sm text-right text-gray-900 font-semibold",
            render: (row: HistorialRow) => {
              const pago = row as AlquilerPago;
              return `$${Number(pago.monto).toFixed(2)}`;
            },
          },
          {
            key: "metodo",
            header: "Método",
            headerClassName:
              "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
            cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
            render: (row: HistorialRow) => {
              const pago = row as AlquilerPago;
              return pago.metodo.charAt(0).toUpperCase() + pago.metodo.slice(1);
            },
          },
          {
            key: "referencia",
            header: "Referencia",
            headerClassName:
              "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
            cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
            render: (row: HistorialRow) => (row as AlquilerPago).referencia || "-",
          },
          ...(onEditar || onEliminar
            ? [
              {
                key: "actions",
                header: "Acciones",
                headerClassName:
                  "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium text-gray-700",
                cellClassName: "px-3 md:px-6 py-4 text-center",
                render: (row: HistorialRow) => (
                  <div className="flex gap-1 md:gap-2 justify-center flex-wrap">
                    {onEditar && (
                      <button
                        onClick={() => onEditar(row)}
                        className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                        title="Editar pago"
                      >
                        <Edit size={18} />
                      </button>
                    )}
                    {onEliminar && (
                      <button
                        onClick={() => onEliminar((row as AlquilerPago).id_pago)}
                        className="text-red-600 hover:text-red-800 transition-colors p-1"
                        title="Eliminar pago"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ),
              },
            ]
            : []),
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
              formatFechaCortaLocal((row as HistorialEnteLegal).fecha_ingreso),
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
              formatFechaHoraLocal((row as HistorialEnteLegal).creado_en),
          },
          ...(onEditar || onEliminar
            ? [
              {
                key: "actions",
                header: "Acciones",
                headerClassName:
                  "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium text-gray-700",
                cellClassName: "px-3 md:px-6 py-4 text-center",
                render: (row: HistorialRow) => (
                  <div className="flex gap-1 md:gap-2 justify-center flex-wrap">
                    {onEditar && (
                      <button
                        onClick={() => onEditar(row)}
                        className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                        title="Editar pago"
                      >
                        <Edit size={18} />
                      </button>
                    )}
                    {onEliminar && (
                      <button
                        onClick={() => onEliminar((row as HistorialEnteLegal).id_historial)}
                        className="text-red-600 hover:text-red-800 transition-colors p-1"
                        title="Eliminar pago"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ),
              },
            ]
            : []),
        ];

  const tableTitle =
    title || (isCompras ? "Historial de Compras" : "Historial de Pagos");
  const tableEmptyMessage =
    emptyMessage ||
    (isCompras ? "No hay compras registradas" : "No hay pagos registrados");

  const handleDownloadReport = () => {
    const validColumns = columns.filter((c) => c.key !== "actions");
    const tableHeaders = validColumns.map((c) => c.header);

    const tableData = historial.map((row) => {
      return validColumns.map((c) => {
        const val = c.render(row);
        return typeof val === "string" || typeof val === "number" ? val : "-";
      });
    });

    let totalGenerado = "0.00";
    if (isCompras) {
      const suma = historial.reduce((acc, current) => acc + Number((current as CompraProducto).precio_total), 0);
      totalGenerado = `$${suma.toFixed(2)}`;
    } else if (isNomina) {
      const suma = historial.reduce((acc, current) => acc + Number((current as NominaPago).monto), 0);
      totalGenerado = `$${suma.toFixed(2)}`;
    } else if (isAlquiler) {
      const suma = historial.reduce((acc, current) => acc + Number((current as AlquilerPago).monto), 0);
      totalGenerado = `$${suma.toFixed(2)}`;
    }

    generateTableReport({
      title: tableTitle,
      subtitle: `Reporte general: ${new Date().toLocaleDateString("es-VE")}`,
      reportInfo: [
        { label: "Total Registros", value: historial.length.toString() },
      ],
      tableHeaders,
      tableData,
      total: totalGenerado,
      filename: `${tableTitle.replace(/\s+/g, "_")}_${new Date().getTime()}.pdf`,
    });
  };

  return (
    <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
      <div className="px-4 md:px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-gray-800">{tableTitle}</h2>
        {historial.length > 0 && (
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
        <GenericTable
          columns={columns}
          rows={historial}
          rowKey={(row) =>
            isCompras
              ? (row as CompraProducto).id_compra
              : isNomina
                ? (row as NominaPago).id_pago
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
