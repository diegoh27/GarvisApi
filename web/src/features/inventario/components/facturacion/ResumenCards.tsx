import type { FacturacionResumen } from "../../api/facturacionApi";

type ResumenCardsProps = {
  resumen?: FacturacionResumen;
  isLoading?: boolean;
};

const formatUsd = (value: number) =>
  new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

const periods: Array<{ key: keyof FacturacionResumen; label: string }> = [
  { key: "semanal", label: "Semanal" },
  { key: "mensual", label: "Mensual" },
  { key: "anual", label: "Anual" },
];

export default function ResumenCards({ resumen, isLoading = false }: ResumenCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {periods.map((period) => (
          <div
            key={period.key}
            className="bg-white rounded-lg shadow-md p-4 md:p-5 animate-pulse"
          >
            <div className="h-5 w-24 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {periods.map((period) => {
        const data = resumen?.[period.key] ?? {
          ingresos: 0,
          egresos: 0,
          balance: 0,
          ingreso_operativo: 0,
          egreso_operativo: 0,
          neto_operativo: 0,
          margen_operativo: 0,
        };

        const balanceClass =
          data.balance >= 0 ? "text-emerald-600" : "text-red-600";

        return (
          <div key={period.key} className="bg-white rounded-lg shadow-md p-4 md:p-5">
            <h3 className="text-sm md:text-base font-semibold text-gray-800 mb-3">
              {period.label}
            </h3>
            <div className="space-y-2 text-sm md:text-[15px]">
              <p className="flex justify-between gap-3">
                <span className="text-gray-600">Ingresos</span>
                <span className="font-medium text-emerald-700">
                  {formatUsd(data.ingresos)}
                </span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-gray-600">Egresos</span>
                <span className="font-medium text-red-700">{formatUsd(data.egresos)}</span>
              </p>
              <p className="flex justify-between gap-3 border-t pt-2 mt-2">
                <span className="text-gray-700 font-medium">Balance</span>
                <span className={`font-semibold ${balanceClass}`}>
                  {formatUsd(data.balance)}
                </span>
              </p>
              <p className="flex justify-between gap-3 border-t pt-2 mt-2">
                <span className="text-gray-700 font-medium">Ingreso operativo</span>
                <span className="font-medium text-emerald-700">
                  {formatUsd(data.ingreso_operativo)}
                </span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-gray-600">Egreso operativo</span>
                <span className="font-medium text-red-700">
                  {formatUsd(data.egreso_operativo)}
                </span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-gray-700 font-medium">Neto operativo</span>
                <span
                  className={`font-semibold ${data.neto_operativo >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                >
                  {formatUsd(data.neto_operativo)}
                </span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-gray-600">Margen operativo</span>
                <span
                  className={`font-medium ${data.margen_operativo >= 0 ? "text-emerald-700" : "text-red-700"
                    }`}
                >
                  {Number(data.margen_operativo || 0).toFixed(2)}%
                </span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
