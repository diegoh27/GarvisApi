import GenericTable from "../GenericTable";
import { formatFechaLocal } from "../../../../shared";
import { Trash2 } from "lucide-react";
import type { FacturacionMovimiento } from "../../api/facturacionApi";

type MovimientosTableProps = {
  movimientos: FacturacionMovimiento[];
  startIndex: number;
  isLoading?: boolean;
  onEliminar?: (idMovimiento: string) => void;
};

const formatDate = (value: string | null | undefined) =>
  value ? formatFechaLocal(value) : "-";

const formatUsd = (value: number) =>
  new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatBs = (value: number) =>
  new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDateShort = (value: string | null | undefined) =>
  value ? formatFechaLocal(value) : "N/A";

const buildItemCode = (row: FacturacionMovimiento) => {
  const rawId = (row.id_cita || row.origen_id || row.id_movimiento || "")
    .replace(/-/g, "")
    .toUpperCase()
    .slice(0, 8);
  if (!rawId) return "-";

  if (row.origen_modulo === "CITA_PAGO") return `CITA-${rawId}`;
  if (row.origen_modulo === "ESP_COMISION") return `COM-${rawId}`;
  return `MOV-${rawId}`;
};

const buildDetailedDescription = (row: FacturacionMovimiento) => {
  if (!["CITA_PAGO", "ESP_COMISION"].includes(row.origen_modulo)) {
    return row.descripcion || "-";
  }

  const eco = row.eco_nombre || "N/A";
  const paciente = row.paciente_nombre || "N/A";
  const cedulaPart = row.paciente_cedula
    ? `CI: ${row.paciente_cedula}`
    : "";
  const rifPart = row.paciente_rif ? `RIF: ${row.paciente_rif}` : "";
  const identPart = [cedulaPart, rifPart].filter(Boolean).join(", ");
  const especialista =
    `${row.especialista_nombre || ""} ${row.especialista_apellido || ""}`.trim() ||
    "N/A";
  const fecha = formatDateShort(row.fecha_cita || row.fecha);

  return `Eco: ${eco} · Paciente: ${paciente}${identPart ? ` (${identPart})` : ""} · Esp: ${especialista} · Cita: ${fecha}`;
};

const origenLabelMap: Record<FacturacionMovimiento["origen_modulo"], string> = {
  CITA_PAGO: "Pago de cita",
  ESP_COMISION: "Pago de comisión",
  INV_COMPRA: "Compra inventario",
  INV_AJUSTE: "Ajuste inventario",
  LEG_PAGO: "Pago obligación",
  NOM_PAGO: "Pago nómina",
  ALQ_PAGO: "Pago alquiler",
  AJUSTE: "Ajuste manual",
};

export default function MovimientosTable({
  movimientos,
  startIndex,
  isLoading = false,
  onEliminar,
}: MovimientosTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto max-w-full">
        <GenericTable
          rows={movimientos}
          isLoading={isLoading}
          tableClassName="w-full min-w-[1240px]"
          theadClassName="bg-white border-b border-gray-200"
          rowKey={(row) => row.id_movimiento}
          columns={[
            {
              key: "id",
              header: "ID",
              headerClassName:
                "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
              cellClassName:
                "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900 font-mono",
              render: (_row, index) =>
                String(startIndex + index + 1).padStart(3, "0"),
            },
            {
              key: "fecha",
              header: "Fecha",
              headerClassName:
                "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
              cellClassName:
                "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
              render: (row) => formatDate(row.fecha),
            },
            {
              key: "codigo_item",
              header: "Código",
              headerClassName:
                "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
              cellClassName:
                "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900 font-mono",
              render: (row) => buildItemCode(row),
            },
            {
              key: "tipo",
              header: "Tipo",
              headerClassName:
                "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
              cellClassName: "px-3 md:px-6 py-4 text-xs md:text-sm",
              render: (row) =>
                row.tipo === "Ingreso" ? (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    Ingreso
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Egreso
                  </span>
                ),
            },
            {
              key: "monto_total_dol",
              header: "Monto $",
              headerClassName:
                "px-3 md:px-6 py-3 text-right text-xs md:text-sm font-medium text-gray-700",
              cellClassName:
                "px-3 md:px-6 py-4 text-xs md:text-sm text-right font-semibold",
              render: (row) => (
                <span
                  className={
                    row.tipo === "Ingreso" ? "text-emerald-700" : "text-red-700"
                  }
                >
                  {formatUsd(row.monto_total_dol || row.monto || 0)}
                </span>
              ),
            },
            {
              key: "monto_total_bs",
              header: "Monto Bs",
              headerClassName:
                "px-3 md:px-6 py-3 text-right text-xs md:text-sm font-medium text-gray-700",
              cellClassName:
                "px-3 md:px-6 py-4 text-xs md:text-sm text-right font-semibold text-slate-700",
              render: (row) => (
                <span>{formatBs(row.monto_total_bs || row.monto_bs || 0)}</span>
              ),
            },
            {
              key: "tasa_dia",
              header: "Tasa día",
              headerClassName:
                "px-3 md:px-6 py-3 text-right text-xs md:text-sm font-medium text-gray-700",
              cellClassName:
                "px-3 md:px-6 py-4 text-xs md:text-sm text-right text-gray-900",
              render: (row) =>
                Number(row.tasa_dia || row.tasa_dia_bcv || 0).toLocaleString("es-VE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                }),
            },
            {
              key: "origen",
              header: "Origen",
              headerClassName:
                "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
              cellClassName:
                "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
              render: (row) => origenLabelMap[row.origen_modulo] || row.origen_modulo,
            },
            {
              key: "descripcion",
              header: "Descripción",
              headerClassName:
                "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
              cellClassName:
                "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900 max-w-[300px]",
              render: (row) => buildDetailedDescription(row),
            },
            {
              key: "referencia",
              header: "Referencia",
              headerClassName:
                "px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-700",
              cellClassName:
                "px-3 md:px-6 py-4 text-xs md:text-sm text-gray-900",
              render: (row) => row.referencia || "-",
            },
            ...(onEliminar
              ? [
                  {
                    key: "actions",
                    header: "Acciones",
                    headerClassName:
                      "px-3 md:px-6 py-3 text-center text-xs md:text-sm font-medium text-gray-700",
                    cellClassName: "px-3 md:px-6 py-4 text-center",
                    render: (row: FacturacionMovimiento) => (
                      <button
                        type="button"
                        onClick={() => onEliminar(row.id_movimiento)}
                        className="text-red-600 hover:text-red-800 transition-colors p-1 inline-flex items-center justify-center"
                        title="Eliminar movimiento"
                      >
                        <Trash2 size={18} />
                      </button>
                    ),
                  },
                ]
              : []),
          ]}
          emptyState="No hay movimientos de facturación"
          loadingState="Cargando movimientos de facturación..."
        />
      </div>
    </div>
  );
}
