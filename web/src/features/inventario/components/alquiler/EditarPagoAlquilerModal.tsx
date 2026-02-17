import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { useUpdatePagoAlquilerMutation } from "../../api/alquilerApi";
import { MONTO_MIN, MONTO_MAX, sanitizeMonto, validarMonto } from "../../utils/validation";
import type { AlquilerPago, UpdatePagoAlquilerPayload } from "../../api/alquilerApi";

interface EditarPagoAlquilerModalProps {
  isOpen: boolean;
  pago: AlquilerPago | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const METODOS: Array<
  "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro"
> = ["Efectivo", "Transferencia", "PagoMovil", "Zelle", "Otro"];

export default function EditarPagoAlquilerModal({
  isOpen,
  pago,
  onClose,
  onSuccess,
}: EditarPagoAlquilerModalProps) {
  const [formData, setFormData] = useState<UpdatePagoAlquilerPayload>({
    fecha_pago: "",
    fecha_proximo_pago: "",
    monto: 0,
    metodo: "Transferencia",
    referencia: "",
  });

  const [error, setError] = useState("");
  const [updatePago, { isLoading, isError, error: mutationError }] =
    useUpdatePagoAlquilerMutation();

  useEffect(() => {
    if (pago && isOpen) {
      setFormData({
        fecha_pago: pago.fecha_pago,
        fecha_proximo_pago: pago.fecha_proximo_pago || "",
        monto: pago.monto,
        metodo: pago.metodo,
        referencia: pago.referencia || "",
      });
      setError("");
    }
  }, [pago, isOpen]);

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

  if (!isOpen || !pago) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const newValue = name === "monto" ? parseFloat(value) || 0 : value;
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
    if (formData.fecha_proximo_pago === "") {
      setError("La fecha próxima es requerida");
      return;
    }
    const errMonto = validarMonto(formData.monto ?? 0);
    if (errMonto) {
      setError(errMonto);
      return;
    }
    if (!formData.metodo) {
      setError("El método de pago es requerido");
      return;
    }
    if ((formData.referencia || "").length > 80) {
      setError("La referencia no puede superar 80 caracteres");
      return;
    }

    try {
      await updatePago({
        idPago: pago.id_pago,
        payload: formData,
      }).unwrap();
      onSuccess?.();
      onClose();
    } catch (err) {
      // Error handled by useEffect
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Editar Pago</h2>
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
              Contrato
            </label>
            <input
              type="text"
              disabled
              value={pago.nombre_contrato || pago.id_contrato || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              ID: {pago.id_pago}
            </label>
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
              Fecha Próxima *
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
              Monto ($) *
            </label>
            <input
              type="number"
              name="monto"
              value={formData.monto || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="0.01"
              step="0.01"
              min={MONTO_MIN}
              max={MONTO_MAX}
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
              maxLength={80}
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
              {isLoading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
