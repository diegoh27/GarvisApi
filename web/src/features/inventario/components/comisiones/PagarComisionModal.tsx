import { X } from "lucide-react";
import { useState, useEffect } from "react";
import type { EspecialistaComision } from "../../api/comisionesApi";
import { useGetDolarOficialQuery } from "../../../dolar/dolarApi";

interface PagarComisionModalProps {
  comision: EspecialistaComision;
  onConfirm: (
    idComision: string,
    fecha_pago: string,
    metodo?: string,
    referencia?: string,
  ) => void;
  onClose: () => void;
  mode?: "pagar" | "editar";
}

const METODOS: Array<
  "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro"
> = ["Efectivo", "Transferencia", "PagoMovil", "Zelle", "Otro"];

export default function PagarComisionModal({
  comision,
  onConfirm,
  onClose,
  mode = "pagar",
}: PagarComisionModalProps) {
  const { data: dolarOficial, isLoading: loadingDolar } = useGetDolarOficialQuery();

  const metodoFromDescripcion = (descripcion?: string | null) => {
    if (!descripcion) return undefined;
    const match = descripcion.match(/metodo:\s*([^\)]+)/i);
    if (!match) return undefined;
    const value = match[1].trim();
    return METODOS.includes(value as any) ? (value as any) : undefined;
  };

  const [formData, setFormData] = useState({
    fecha_pago: comision.fecha_pago || new Date().toISOString().split("T")[0],
    metodo: (metodoFromDescripcion(comision.descripcion_pago) || "Transferencia") as
      | "Efectivo"
      | "Transferencia"
      | "PagoMovil"
      | "Zelle"
      | "Otro",
    referencia: comision.referencia_pago || "",
    monto_bs: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Calcular monto en Bs basado en el monto de la comisión en USD y la tasa del BCV
  const montoCalculadoBs = comision && dolarOficial
    ? Math.round((comision.monto * dolarOficial.promedio) * 100) / 100
    : null;

  // Autocompletar monto en Bs cuando cambia la tasa del BCV
  useEffect(() => {
    if (montoCalculadoBs !== null && !formData.monto_bs) {
      setFormData((prev) => ({
        ...prev,
        monto_bs: montoCalculadoBs.toString(),
      }));
    }
  }, [montoCalculadoBs]);

  useEffect(() => {
    setError("");
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fecha_pago) {
      setError("La fecha de pago es requerida");
      return;
    }

    if (!formData.monto_bs || parseFloat(formData.monto_bs) <= 0) {
      setError("El monto en Bs es requerido y debe ser mayor a 0");
      return;
    }

    try {
      setIsLoading(true);
      await onConfirm(
        comision.id_comision,
        formData.fecha_pago,
        formData.metodo,
        formData.referencia || undefined,
      );
      onClose();
    } catch (err) {
      setError("Error al procesar el pago");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        {/* Encabezado */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "editar" ? "Editar pago" : "Pagar cita"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div className="px-6 py-4 space-y-4">
          {/* Información de la comisión */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Especialista:</span>
              <span className="font-medium text-gray-900">
                {comision.especialista_nombre}{" "}
                {comision.especialista_apellido}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Especialidad:</span>
              <span className="font-medium text-gray-900">
                {comision.eco_nombre || "-"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Monto (USD):</span>
              <span className="font-bold text-emerald-600">
                ${Number(comision.monto).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Comisión (%):</span>
              <span className="font-medium text-gray-900">
                {Number(comision.porcentaje).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-gray-600">Tasa BCV:</span>
              <span className="font-medium text-gray-900">
                {loadingDolar ? (
                  "Cargando..."
                ) : dolarOficial ? (
                  `Bs. ${dolarOficial.promedio.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}/$`
                ) : (
                  "No disponible"
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total en Bs:</span>
              <span className="font-bold text-blue-600">
                {loadingDolar ? (
                  "Calculando..."
                ) : montoCalculadoBs !== null ? (
                  `Bs. ${montoCalculadoBs.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                ) : (
                  "Bs. 0,00"
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-gray-600">Fecha de Cita:</span>
              <span className="font-medium text-gray-900">
                {comision.fecha_cita ? new Date(comision.fecha_cita).toLocaleDateString("es-ES") : "-"}
              </span>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Fecha de pago */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Pago
              </label>
              <input
                type="date"
                name="fecha_pago"
                value={formData.fecha_pago}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            {/* Monto en Bs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto en Bs *
              </label>
              <input
                type="number"
                name="monto_bs"
                value={formData.monto_bs}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
              {loadingDolar && (
                <p className="text-xs text-teal-500 mt-1">Calculando monto en Bs...</p>
              )}
              {montoCalculadoBs !== null && dolarOficial && (
                <p className="text-xs text-gray-500 mt-1">
                  Calculado: <strong>{montoCalculadoBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</strong>
                  {" "}
                  (Tasa BCV: {dolarOficial.promedio.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs/$)
                </p>
              )}
            </div>

            {/* Método de pago */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Método de Pago
              </label>
              <select
                name="metodo"
                value={formData.metodo}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {METODOS.map((metodo) => (
                  <option key={metodo} value={metodo}>
                    {metodo}
                  </option>
                ))}
              </select>
            </div>

            {/* Referencia (opcional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referencia (opcional)
              </label>
              <input
                type="text"
                name="referencia"
                value={formData.referencia}
                onChange={handleInputChange}
                placeholder="Ej: Número de transferencia"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? "Procesando..."
                  : mode === "editar"
                    ? "Guardar cambios"
                    : "Confirmar pago"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
