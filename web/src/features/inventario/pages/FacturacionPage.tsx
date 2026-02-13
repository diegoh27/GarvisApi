import { useMemo, useState } from "react";
import {
  useGetResumenFacturacionQuery,
  useListMovimientosFacturacionQuery,
} from "../api/facturacionApi";
import type { FacturacionMovimiento } from "../api/facturacionApi";
import ResumenCards from "../components/facturacion/ResumenCards";
import MovimientosTable from "../components/facturacion/MovimientosTable";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";

type QuickPeriod = "custom" | "hoy" | "7dias" | "mes" | "anio";

const ORIGEN_OPTIONS: Array<{
  value: "" | FacturacionMovimiento["origen_modulo"];
  label: string;
}> = [
    { value: "", label: "Todos los origenes" },
    { value: "CITA_PAGO", label: "Pago de cita" },
    { value: "ESP_COMISION", label: "Pago de comisión" },
    { value: "INV_COMPRA", label: "Compra inventario" },
    { value: "INV_AJUSTE", label: "Ajuste inventario" },
    { value: "LEG_PAGO", label: "Pago obligación" },
    { value: "NOM_PAGO", label: "Pago nómina" },
    { value: "ALQ_PAGO", label: "Pago alquiler" },
    { value: "AJUSTE", label: "Ajuste manual" },
  ];

const toIsoDate = (date: Date) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().split("T")[0];
};

const getQuickPeriodRange = (period: Exclude<QuickPeriod, "custom">) => {
  const today = new Date();
  const end = toIsoDate(today);

  if (period === "hoy") {
    return { from: end, to: end };
  }

  if (period === "7dias") {
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - 6);
    return { from: toIsoDate(fromDate), to: end };
  }

  if (period === "mes") {
    const fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toIsoDate(fromDate), to: end };
  }

  const fromDate = new Date(today.getFullYear(), 0, 1);
  return { from: toIsoDate(fromDate), to: end };
};

export default function FacturacionPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tipo, setTipo] = useState<"" | "Ingreso" | "Egreso">("");
  const [origen, setOrigen] = useState<"" | FacturacionMovimiento["origen_modulo"]>("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>("custom");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const offset = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage]);

  const { data: resumenData, isLoading: resumenLoading, error: resumenError } =
    useGetResumenFacturacionQuery();

  const {
    data: movimientosData,
    isLoading: movimientosLoading,
    error: movimientosError,
  } = useListMovimientosFacturacionQuery({
    q: searchQuery || undefined,
    tipo: (tipo || undefined) as "Ingreso" | "Egreso" | undefined,
    origen_modulo: (origen || undefined) as FacturacionMovimiento["origen_modulo"] | undefined,
    fecha_desde: fechaDesde || undefined,
    fecha_hasta: fechaHasta || undefined,
    limit: itemsPerPage,
    offset,
  });

  const movimientos = movimientosData?.rows ?? [];
  const totalItems = movimientosData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const applyQuickPeriod = (period: Exclude<QuickPeriod, "custom">) => {
    const range = getQuickPeriodRange(period);
    setFechaDesde(range.from);
    setFechaHasta(range.to);
    setQuickPeriod(period);
    setCurrentPage(1);
  };

  if (resumenError || movimientosError) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-12">
          <p className="text-red-500">Error al cargar la información de facturación</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Facturación</h1>
        <p className="text-sm text-gray-600 mt-1">
          Resumen de ingresos, egresos y balance con historial de movimientos.
        </p>
      </div>

      <ResumenCards resumen={resumenData} isLoading={resumenLoading} />

      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { id: "hoy", label: "Hoy" },
            { id: "7dias", label: "7 días" },
            { id: "mes", label: "Mes" },
            { id: "anio", label: "Año" },
          ].map((period) => {
            const isActive = quickPeriod === period.id;
            return (
              <button
                key={period.id}
                type="button"
                onClick={() =>
                  applyQuickPeriod(
                    period.id as Exclude<QuickPeriod, "custom">,
                  )
                }
                className={`px-3 py-1.5 text-xs md:text-sm rounded-full border transition-colors ${isActive
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
              >
                {period.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <SearchBar
            placeholder="Buscar por descripción o referencia..."
            onSearch={(query) => {
              setSearchQuery(query);
              setCurrentPage(1);
            }}
            className="md:col-span-2"
          />
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as "" | "Ingreso" | "Egreso");
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Todos los tipos</option>
            <option value="Ingreso">Ingreso</option>
            <option value="Egreso">Egreso</option>
          </select>

          <select
            value={origen}
            onChange={(e) => {
              setOrigen(e.target.value as "" | FacturacionMovimiento["origen_modulo"]);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {ORIGEN_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                setQuickPeriod("custom");
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value);
                setQuickPeriod("custom");
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      <MovimientosTable
        movimientos={movimientos}
        isLoading={movimientosLoading}
        startIndex={offset}
      />

      {!movimientosLoading && totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          label="movimientos"
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
