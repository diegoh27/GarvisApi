import { useState, useMemo } from "react";
import type { CompraProducto, ConsumoProducto } from "../api/productosApi";
import type { HistorialEnteLegal } from "../api/entesLegalesApi";
import type { AlquilerPago } from "../api/alquilerApi";
import type { NominaPago } from "../api/nominaApi";
import GenericTable from "./GenericTable";
import { formatFechaLocal, formatFechaCortaLocal, formatFechaHoraLocal } from "../../../shared";
import { Edit, Trash2, FileDown, Plus, Printer } from "lucide-react";
import { generateTableReport } from "../../../utils/generateTableReport";
import Pagination from "./Pagination";

type HistorialRow =
  | CompraProducto
  | ConsumoProducto
  | HistorialEnteLegal
  | NominaPago
  | AlquilerPago;

type HistorialPagosTableProps = {
  historial: HistorialRow[];
  isLoading: boolean;
  variant?: "compras" | "consumos" | "pagos" | "nomina" | "alquiler";
  title?: string;
  emptyMessage?: string;
  onEditar?: (row: HistorialRow) => void;
  onEliminar?: (id: string) => void;
  paginationInfo?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    label: string;
    onPageChange: (page: number) => void;
  };
  onRegistrarConsumo?: () => void;
};

export default function HistorialPagosTable({
  historial,
  isLoading,
  variant = "compras",
  title,
  emptyMessage,
  onEditar,
  onEliminar,
  paginationInfo,
  onRegistrarConsumo,
}: HistorialPagosTableProps) {
  const isCompras = variant === "compras";
  const isConsumos = variant === "consumos";
  const isNomina = variant === "nomina";
  const isAlquiler = variant === "alquiler";

  const startIndex = paginationInfo ? (paginationInfo.currentPage - 1) * paginationInfo.itemsPerPage : 0;

  const [dateFilter, setDateFilter] = useState("all");

  const filteredHistorial = useMemo(() => {
    if (dateFilter === "all") return historial;
    
    return historial.filter((row) => {
      let dateStr = "";
      if (isCompras) {
        dateStr = (row as CompraProducto).fecha_ingreso;
      } else if (isConsumos) {
        dateStr = (row as ConsumoProducto).fecha_consumo;
      } else if (isNomina) {
        dateStr = (row as NominaPago).fecha_pago;
      } else if (isAlquiler) {
        dateStr = (row as AlquilerPago).fecha_pago;
      } else {
        dateStr = (row as HistorialEnteLegal).fecha_ingreso || (row as HistorialEnteLegal).creado_en;
      }

      if (!dateStr) return true;

      const rowDate = new Date(dateStr);
      const today = new Date();
      // Adjust timezone to local midnight for strict day diff logic
      rowDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - rowDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      switch (dateFilter) {
        case "hoy":
          return diffDays === 0;
        case "semanal":
          return diffDays >= 0 && diffDays <= 7;
        case "semana_pasada":
          return diffDays > 7 && diffDays <= 14;
        case "mensual":
          return rowDate.getMonth() === today.getMonth() && rowDate.getFullYear() === today.getFullYear();
        case "trimestral":
          const mDiff = (today.getFullYear() - rowDate.getFullYear()) * 12 + (today.getMonth() - rowDate.getMonth());
          return mDiff >= 0 && mDiff <= 3;
        case "anual":
          return rowDate.getFullYear() === today.getFullYear();
        default:
          return true;
      }
    });
  }, [historial, dateFilter, isCompras, isConsumos, isNomina, isAlquiler]);

  const columns = isCompras
    ? [
      {
        key: "id",
        header: "ID",
        headerClassName: "px-3 md:px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
        cellClassName: "px-3 md:px-6 py-5 text-sm font-medium text-gray-400 whitespace-nowrap",
        render: (_row: HistorialRow, index: number) => {
          return String(startIndex + index + 1).padStart(3, "0");
        },
      },
      {
        key: "producto",
        header: "Producto",
        headerClassName: "px-3 md:px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
        cellClassName: "px-3 md:px-6 py-5 text-sm font-bold text-gray-800 whitespace-nowrap",
        render: (row: HistorialRow) => (row as CompraProducto).nombre_producto,
      },
      {
        key: "fecha",
        header: "Fecha",
        headerClassName: "px-3 md:px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
        cellClassName: "px-3 md:px-6 py-5 text-sm text-gray-500 whitespace-nowrap",
        render: (row: HistorialRow) =>
          formatFechaCortaLocal((row as CompraProducto).fecha_ingreso),
      },
      {
        key: "cant",
        header: "Cant",
        headerClassName: "px-3 md:px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
        cellClassName: "px-3 md:px-6 py-5 text-sm text-right font-medium text-gray-800 whitespace-nowrap",
        render: (row: HistorialRow) => (row as CompraProducto).cantidad,
      },
      {
        key: "unit",
        header: "P.Unit.",
        headerClassName: "px-3 md:px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
        cellClassName: "px-3 md:px-6 py-5 text-sm text-right text-gray-500 whitespace-nowrap",
        render: (row: HistorialRow) => {
          const compra = row as CompraProducto;
          return `$${Number(compra.precio_unitario).toFixed(2)}`;
        },
      },
      {
        key: "total",
        header: "P.Total",
        headerClassName: "px-3 md:px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
        cellClassName: "px-3 md:px-6 py-5 text-sm text-right font-bold text-gray-800 whitespace-nowrap",
        render: (row: HistorialRow) => {
          const compra = row as CompraProducto;
          return `$${Number(compra.precio_total).toFixed(2)}`;
        },
      },
      {
        key: "prov",
        header: "Prov.",
        headerClassName: "px-3 md:px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
        cellClassName: "px-3 md:px-6 py-5 text-sm text-gray-500 whitespace-nowrap",
        render: (row: HistorialRow) => (row as CompraProducto).proveedor || "-",
      },
      ...(onEditar || onEliminar
        ? [
          {
            key: "actions",
            header: "Acciones",
            headerClassName:
              "px-3 md:px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
            cellClassName: "px-3 md:px-6 py-5 text-center",
            render: (row: HistorialRow) => (
              <div className="flex gap-1 md:gap-2 justify-center flex-wrap">
                {onEditar && (
                  <button
                    onClick={() => onEditar(row)}
                    className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors"
                    title="Editar compra"
                  >
                    <Edit size={15} />
                  </button>
                )}
                {onEliminar && (
                  <button
                    onClick={() => onEliminar((row as CompraProducto).id_compra)}
                    className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md p-0 hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                    title="Eliminar compra"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ),
          },
        ]
        : []),
    ]
    : isConsumos
      ? [
        {
          key: "id",
          header: "ID",
          headerClassName: "px-3 md:px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
          cellClassName: "px-3 md:px-6 py-5 text-sm font-medium text-gray-400 whitespace-nowrap",
          render: (_row: HistorialRow, index: number) => {
            return String(startIndex + index + 1).padStart(3, "0");
          },
        },
        {
          key: "numero_cita",
          header: "Nº Cita",
          headerClassName: "px-3 md:px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
          cellClassName: "px-3 md:px-6 py-5 text-sm font-medium text-gray-800 whitespace-nowrap",
          render: (row: HistorialRow) => {
            const consumo = row as ConsumoProducto;
            if (consumo.origen === 'manual') return "Manual";
            return consumo.numero_cita ? `Cita_${String(consumo.numero_cita).padStart(3, '0')}` : "-";
          },
        },
        {
          key: "fecha",
          header: "Fecha Cita",
          headerClassName: "px-3 md:px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
          cellClassName: "px-3 md:px-6 py-5 text-sm text-gray-500 whitespace-nowrap",
          render: (row: HistorialRow) =>
            formatFechaCortaLocal((row as ConsumoProducto).fecha_consumo),
        },
        {
          key: "paciente",
          header: "Paciente",
          headerClassName: "px-3 md:px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
          cellClassName: "px-3 md:px-6 py-5 text-sm font-bold text-gray-800 whitespace-nowrap",
          render: (row: HistorialRow) => {
            const consumo = row as ConsumoProducto;
            if (consumo.origen === 'manual') return <span className="text-gray-400 font-normal">-</span>;
            return `${consumo.paciente_nombre} ${consumo.paciente_apellido}`;
          },
        },
        {
          key: "especialista",
          header: "Especialista",
          headerClassName: "px-3 md:px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
          cellClassName: "px-3 md:px-6 py-5 text-sm text-gray-700 whitespace-nowrap",
          render: (row: HistorialRow) => {
            const consumo = row as ConsumoProducto;
            if (consumo.origen === 'manual') return <span className="text-gray-400">-</span>;
            return consumo.especialista_nombre ? `Dr(a). ${consumo.especialista_nombre} ${consumo.especialista_apellido}` : "N/A";
          },
        },
        {
          key: "productos",
          header: "Productos usados",
          headerClassName: "px-3 md:px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
          cellClassName: "px-3 md:px-6 py-5 text-sm text-teal-600 font-medium",
          render: (row: HistorialRow) => (row as ConsumoProducto).nombre_producto,
        },
        {
          key: "descripcion",
          header: "Descripción",
          headerClassName: "px-3 md:px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white border-b-0",
          cellClassName: "px-3 md:px-6 py-5 text-sm text-gray-600 whitespace-normal max-w-[200px]",
          render: (row: HistorialRow) => {
            const consumo = row as ConsumoProducto;
            if (consumo.origen === 'manual') return consumo.descripcion || <span className="italic text-gray-400">Sin descripción</span>;
            return <span className="text-gray-400 italic">Automático por cita</span>;
          },
        },
      ]
      : isNomina
      ? [
        {
          key: "id_pago",
          header: "ID",
          headerClassName: "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
          cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
          render: (_row: HistorialRow, index: number) => {
            return String(startIndex + index + 1).padStart(3, "0");
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
            render: (_row: HistorialRow, index: number) => {
              return String(startIndex + index + 1).padStart(3, "0");
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
            render: (_row: HistorialRow, index: number) => {
              return String(startIndex + index + 1).padStart(3, "0");
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
    title || (isCompras ? "Historial de compras" : isConsumos ? "Registro de consumo de producto" : "Historial de Pagos");
  const tableEmptyMessage =
    emptyMessage ||
    (isCompras ? "No hay registros de compras" : isConsumos ? "No hay registros de consumo" : "No hay pagos registrados");

  const handleDownloadReport = () => {
    const validColumns = columns.filter((c) => c.key !== "actions" && c.header.toUpperCase() !== "ID");
    const tableHeaders = validColumns.map((c) => c.header);

    const tableData = filteredHistorial.map((row, index) => {
      return validColumns.map((c) => {
        const val = c.render(row, index);
        return typeof val === "string" || typeof val === "number" ? val : "-";
      });
    });

    let totalGenerado = "0.00";
    if (isCompras) {
      const suma = filteredHistorial.reduce((acc, current) => acc + Number((current as CompraProducto).precio_total), 0);
      totalGenerado = `$${suma.toFixed(2)}`;
    } else if (isNomina) {
      const suma = filteredHistorial.reduce((acc, current) => acc + Number((current as NominaPago).monto), 0);
      totalGenerado = `$${suma.toFixed(2)}`;
    } else if (isAlquiler) {
      const suma = filteredHistorial.reduce((acc, current) => acc + Number((current as AlquilerPago).monto), 0);
      totalGenerado = `$${suma.toFixed(2)}`;
    }

    generateTableReport({
      title: tableTitle,
      subtitle: `Reporte general: ${new Date().toLocaleDateString("es-VE")}${dateFilter !== 'all' ? ` (Filtro activo)` : ''}`,
      reportInfo: [
        { label: "Total Registros", value: filteredHistorial.length.toString() },
      ],
      tableHeaders,
      tableData,
      total: totalGenerado,
      filename: `${tableTitle.replace(/\s+/g, "_")}_${new Date().getTime()}.pdf`,
    });
  };

  const handlePrint = () => {
    const validColumns = columns.filter((c) => c.key !== "actions" && c.header.toUpperCase() !== "ID");
    const headers = validColumns.map((c) => c.header);
    const rows = filteredHistorial.map((row, index) =>
      validColumns.map((c) => {
        const val = c.render(row, index);
        return typeof val === "string" || typeof val === "number" ? String(val) : "-";
      })
    );
    const total = isCompras
      ? filteredHistorial.reduce((acc, r) => acc + Number((r as CompraProducto).precio_total), 0)
      : 0;

    const filterLabel = DATE_FILTER_OPTIONS.find((o) => o.value === dateFilter)?.label ?? "Todo el tiempo";
    const fecha = new Date().toLocaleDateString("es-VE", { day: "2-digit", month: "long", year: "numeric" });

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>${tableTitle}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; background: #fff; padding: 32px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #0d9488; padding-bottom: 16px; }
          .header-left h1 { font-size: 20px; font-weight: 700; color: #0d9488; }
          .header-left p { font-size: 12px; color: #6b7280; margin-top: 4px; }
          .header-right { text-align: right; font-size: 11px; color: #6b7280; }
          .header-right strong { color: #1f2937; display: block; font-size: 13px; margin-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          thead tr { background: #f0fdfa; }
          th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #0d9488; border-bottom: 2px solid #ccfbf1; }
          td { padding: 10px 12px; font-size: 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
          tbody tr:nth-child(even) td { background: #fafafa; }
          .footer { margin-top: 20px; display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          .total { font-size: 15px; font-weight: 700; color: #0d9488; }
          @media print { @page { margin: 20mm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>Garvis · ${tableTitle}</h1>
            <p>Filtro: ${filterLabel} · ${filteredHistorial.length} registro(s)</p>
          </div>
          <div class="header-right">
            <strong>Fecha de impresión</strong>
            ${fecha}
          </div>
        </div>
        <table>
          <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows.map((r) => `<tr>${r.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
        <div class="footer">
          <span>Generado por Garvis · Sistema de Gestión Médica</span>
          ${isCompras && total > 0 ? `<span class="total">Total: $${total.toFixed(2)}</span>` : ""}
        </div>
      </body>
      </html>
    `;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const DATE_FILTER_OPTIONS = [
    { value: "all", label: "Todo el tiempo" },
    { value: "hoy", label: "Hoy" },
    { value: "semanal", label: "7 días" },
    { value: "semana_pasada", label: "Sem. pasada" },
    { value: "mensual", label: "Este mes" },
    { value: "trimestral", label: "Trimestre" },
    { value: "anual", label: "Este año" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      {/* ── Header principal ── */}
      <div className="px-5 pt-5 pb-0 flex flex-col gap-3 bg-white">
        {/* Fila título + acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800 leading-tight">{tableTitle}</h2>
          {historial.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {onRegistrarConsumo && (
                <button
                  onClick={onRegistrarConsumo}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 text-nowrap"
                >
                  <Plus size={16} />
                  Registrar consumo manual
                </button>
              )}
              {filteredHistorial.length > 0 && isCompras && (
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:border-gray-300 text-nowrap"
                  title="Imprimir historial de compras"
                >
                  <Printer size={16} />
                  Imprimir
                </button>
              )}
              {filteredHistorial.length > 0 && (
                <button
                  onClick={handleDownloadReport}
                  className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700 text-nowrap"
                >
                  <FileDown size={16} />
                  Descargar Reporte
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Filtros de fecha (pill buttons) ── */}
        {historial.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pb-3 border-b border-gray-100">
            {DATE_FILTER_OPTIONS.map((opt) => {
              const isActive = dateFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setDateFilter(opt.value)}
                  className={`
                    inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium
                    border transition-all duration-150 whitespace-nowrap
                    ${isActive
                      ? "bg-teal-600 border-teal-600 text-white shadow-sm"
                      : "bg-white border-gray-200 text-gray-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50"
                    }
                  `}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="overflow-x-auto max-w-full text-nowrap">
        <GenericTable
          columns={columns}
          rows={filteredHistorial}
          rowKey={(row) =>
            isCompras
              ? (row as CompraProducto).id_compra
              : isNomina
                ? (row as NominaPago).id_pago
                : (row as HistorialEnteLegal).id_historial
          }
          tableClassName="w-full min-w-full text-sm"
          theadClassName="bg-white border-b border-gray-100"
          getRowClassName={() => "bg-white border-b border-gray-50 hover:bg-gray-50/50 transition-colors"}
          isLoading={isLoading}
          loadingState="Cargando historial..."
          emptyState={tableEmptyMessage}
        />
      </div>
      {paginationInfo && <Pagination {...paginationInfo} />}
    </div>
  );
}
