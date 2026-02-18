import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Obligacion } from "../../api";
import { useRegistrarPagoObligacionMutation } from "../../api";
import { toDateKey } from "../../../../shared";
import { MONTO_MIN, MONTO_MAX, sanitizeMonto, validarMonto } from "../../utils/validation";

interface GenerarPagoObligacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  obligacion: Obligacion | null;
}

const addPeriodo = (fecha: string, periodo?: Obligacion["periodo"]): string => {
  if (!fecha) return fecha;
  const base = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(base.getTime())) return fecha;
  const next = new Date(base);
  switch (periodo) {
    case "Mensual":
      next.setMonth(next.getMonth() + 1);
      break;
    case "Trimestral":
      next.setMonth(next.getMonth() + 3);
      break;
    case "Semestral":
      next.setMonth(next.getMonth() + 6);
      break;
    case "Anual":
      next.setFullYear(next.getFullYear() + 1);
      break;
    case "Unico":
      return base.toISOString().split("T")[0];
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return next.toISOString().split("T")[0];
};

export default function GenerarPagoObligacionModal({
  isOpen,
  onClose,
  obligacion,
}: GenerarPagoObligacionModalProps) {
  const [registrarPago, { isLoading }] = useRegistrarPagoObligacionMutation();
  const [formData, setFormData] = useState({
    fecha_pago: toDateKey(new Date()),
    monto: "",
    fecha_proxima_vencimiento: "",
  });
  const [isFechaProximoDirty, setIsFechaProximoDirty] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen && obligacion) {
      const hoy = toDateKey(new Date());
      setFormData((prev) => ({
        ...prev,
        fecha_pago: hoy,
        fecha_proxima_vencimiento: addPeriodo(hoy, obligacion.periodo),
      }));
      setIsFechaProximoDirty(false);
      setError("");
      setSuccess("");
    }
  }, [isOpen, obligacion?.id_obligacion]);

  useEffect(() => {
    if (isOpen && obligacion && !isFechaProximoDirty && formData.fecha_pago) {
      setFormData((prev) => ({
        ...prev,
        fecha_proxima_vencimiento: addPeriodo(prev.fecha_pago, obligacion.periodo),
      }));
    }
  }, [formData.fecha_pago, obligacion?.periodo, isFechaProximoDirty, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!obligacion) return;

    if (!formData.fecha_pago) {
      setError("La fecha de pago es requerida");
      return;
    }

    const errMonto = validarMonto(formData.monto);
    if (errMonto) {
      setError(errMonto);
      return;
    }

    if (!formData.fecha_proxima_vencimiento) {
      setError("La próxima fecha de vencimiento es requerida");
      return;
    }

    try {
      await registrarPago({
        id: obligacion.id_obligacion,
        payload: {
          fecha_pago: formData.fecha_pago,
          monto: Number(formData.monto),
          fecha_proxima_vencimiento: formData.fecha_proxima_vencimiento,
        },
      }).unwrap();

      setSuccess("Pago registrado exitosamente");
      setTimeout(() => {
        setFormData({
          fecha_pago: toDateKey(new Date()),
          monto: "",
          fecha_proxima_vencimiento: "",
        });
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.data?.message || "Error al registrar el pago");
    }
  };

  const hoy = toDateKey(new Date());
  const fechaVenc = obligacion?.fecha_vencimiento
    ? obligacion.fecha_vencimiento.includes("T")
      ? obligacion.fecha_vencimiento.split("T")[0]
      : obligacion.fecha_vencimiento.slice(0, 10)
    : null;
  const estaVencido = !!fechaVenc && fechaVenc <= hoy;

  if (!isOpen || !obligacion) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 md:p-6 border-b">
          <div>
            <h2 className="text-lg md:text-xl font-bold">Generar Pago</h2>
            <p className="text-sm text-gray-600 mt-1">
              {obligacion.nombre_ente} - {obligacion.concepto}
            </p>
            {estaVencido && (
              <p className="text-sm font-medium text-amber-700 mt-1">
                Esta obligación está vencida{fechaVenc ? ` (vencimiento: ${fechaVenc})` : ""}.
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Pago *
            </label>
            <input
              type="date"
              value={formData.fecha_pago}
              onChange={(e) =>
                setFormData({ ...formData, fecha_pago: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Próximo vencimiento se calcula según período ({obligacion.periodo}). Puedes editarlo abajo.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto ($) *
            </label>
            <input
              type="number"
              step="0.01"
              min={MONTO_MIN}
              max={MONTO_MAX}
              value={formData.monto}
              onChange={(e) =>
                setFormData({ ...formData, monto: sanitizeMonto(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Próxima Fecha de Vencimiento *
            </label>
            <input
              type="date"
              value={formData.fecha_proxima_vencimiento}
              onChange={(e) => {
                setIsFechaProximoDirty(true);
                setFormData({
                  ...formData,
                  fecha_proxima_vencimiento: e.target.value,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
              {success}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors disabled:bg-emerald-300 disabled:cursor-not-allowed"
            >
              {isLoading ? "Registrando..." : "Registrar Pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
