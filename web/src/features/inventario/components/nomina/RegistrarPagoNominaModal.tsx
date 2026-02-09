import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { useRegistrarPagoNominaMutation } from "../../api/nominaApi";
import type { RegistrarPagoNominaPayload } from "../../api/nominaApi";

interface RegistrarPagoNominaModalProps {
  isOpen: boolean;
  empleadoId: string | null;
  empleadoNombre: string | null;
  empleadoPeriodo?: "Semanal" | "Quincenal" | "Mensual";
  empleadoSueldo?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const METODOS: Array<
  "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro"
> = ["Efectivo", "Transferencia", "PagoMovil", "Zelle", "Otro"];

export default function RegistrarPagoNominaModal({
  isOpen,
  empleadoId,
  empleadoNombre,
  empleadoPeriodo,
  empleadoSueldo,
  onClose,
  onSuccess,
}: RegistrarPagoNominaModalProps) {
  const [formData, setFormData] = useState<RegistrarPagoNominaPayload>({
    fecha_pago: new Date().toISOString().split("T")[0],
    fecha_proximo_pago: new Date().toISOString().split("T")[0],
    monto: 0,
    metodo: "Transferencia",
    referencia: "",
  });
  const [isFechaProximoDirty, setIsFechaProximoDirty] = useState(false);

  const [error, setError] = useState("");
  const [registrarPago, { isLoading, isError, error: mutationError }] =
    useRegistrarPagoNominaMutation();

  useEffect(() => {
    if (isError && mutationError) {
      const parseError = (err: unknown) => {
        if (err && typeof err === "object" && "data" in err) {
          return (err as any).data?.message || "Error desconocido";
        }
        return "Error desconocido";
      };
      setError(parseError(mutationError));
    }
  }, [isError, mutationError]);

  const addPeriodo = (fecha: string, periodo?: string) => {
    if (!fecha) return fecha;
    const base = new Date(`${fecha}T00:00:00`);
    if (Number.isNaN(base.getTime())) return fecha;
    const next = new Date(base);
    if (periodo === "Semanal") {
      next.setDate(next.getDate() + 7);
    } else if (periodo === "Quincenal") {
      next.setDate(next.getDate() + 15);
    } else if (periodo === "Mensual") {
      next.setMonth(next.getMonth() + 1);
    }
    return next.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        monto: empleadoSueldo ?? prev.monto,
        fecha_proximo_pago: addPeriodo(
          prev.fecha_pago,
          empleadoPeriodo,
        ),
      }));
      setIsFechaProximoDirty(false);
    }
  }, [isOpen, empleadoSueldo, empleadoPeriodo]);

  useEffect(() => {
    if (!isFechaProximoDirty && formData.fecha_pago) {
      setFormData((prev) => ({
        ...prev,
        fecha_proximo_pago: addPeriodo(prev.fecha_pago, empleadoPeriodo),
      }));
    }
  }, [formData.fecha_pago, empleadoPeriodo, isFechaProximoDirty]);

  if (!isOpen || !empleadoId) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const newValue = name === "monto" ? parseFloat(value) || 0 : value;
    if (name === "fecha_proximo_pago") {
      setIsFechaProximoDirty(true);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.fecha_pago) {
      setError("La fecha de pago es requerida");
      return;
    }
    if (!formData.fecha_proximo_pago) {
      setError("La fecha próxima es requerida");
      return;
    }
    if (formData.monto <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }
    if (!formData.metodo) {
      setError("El método de pago es requerido");
      return;
    }

    try {
      await registrarPago({
        idEmpleado: empleadoId,
        payload: formData,
      }).unwrap();
      setFormData({
        fecha_pago: new Date().toISOString().split("T")[0],
        fecha_proximo_pago: new Date().toISOString().split("T")[0],
        monto: 0,
        metodo: "Transferencia",
        referencia: "",
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      // Error is handled by useEffect
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Registrar Pago
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-2 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Empleado
            </label>
            <input
              type="text"
              disabled
              value={empleadoNombre || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Pago *
            </label>
            <input
              type="date"
              name="fecha_pago"
              value={formData.fecha_pago}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Proxima *
            </label>
            <input
              type="date"
              name="fecha_proximo_pago"
              value={formData.fecha_proximo_pago}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto *
            </label>
            <input
              type="number"
              name="monto"
              value={formData.monto || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de Pago *
            </label>
            <select
              name="metodo"
              value={formData.metodo}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {METODOS.map((metodo) => (
                <option key={metodo} value={metodo}>
                  {metodo.charAt(0).toUpperCase() + metodo.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referencia
            </label>
            <input
              type="text"
              name="referencia"
              value={formData.referencia}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Ref. de transferencia, número de cheque, etc."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 rounded-lg font-medium transition-colors"
            >
              {isLoading ? "Registrando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
