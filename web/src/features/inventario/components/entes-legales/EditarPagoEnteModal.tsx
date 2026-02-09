import { useState, useEffect } from "react";
import { useUpdatePagoObligacionMutation, type HistorialEnteLegal } from "../../api";
import { X } from "lucide-react";

interface EditarPagoEnteModalProps {
  isOpen: boolean;
  onClose: () => void;
  pago: HistorialEnteLegal | null;
  onSuccess?: () => void;
}

export default function EditarPagoEnteModal({
  isOpen,
  onClose,
  pago,
  onSuccess,
}: EditarPagoEnteModalProps) {
  const [updatePago, { isLoading }] = useUpdatePagoObligacionMutation();
  const [formData, setFormData] = useState({
    fecha_pago: "",
    monto: "",
    metodo: "Transferencia",
    referencia: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Cargar datos del pago cuando se abre el modal
  useEffect(() => {
    if (isOpen && pago) {
      setFormData({
        fecha_pago: pago.fecha_ingreso || "",
        monto: pago.precio_unitario?.toString() || "",
        metodo: "Transferencia", // Por defecto, no tenemos este dato en HistorialEnteLegal
        referencia: "",
      });
      setError("");
      setSuccess("");
    }
  }, [isOpen, pago]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pago) return;

    setError("");
    setSuccess("");

    // Validación
    if (!formData.fecha_pago || !formData.monto) {
      setError("La fecha y el monto son obligatorios");
      return;
    }

    const monto = parseFloat(formData.monto);
    if (monto <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    try {
      await updatePago({
        idPago: pago.id_historial,
        payload: {
          fecha_pago: formData.fecha_pago,
          monto,
          metodo: formData.metodo as any,
          referencia: formData.referencia || undefined,
        },
      }).unwrap();

      onSuccess?.();
      setSuccess("Pago actualizado exitosamente");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.data?.message || "Error al actualizar el pago");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              Editar Pago
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {pago?.nombre_ente || "Ente Legal"} - {pago?.concepto}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          {/* Mensajes */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Fecha de Pago */}
          <div>
            <label htmlFor="fecha_pago" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Pago *
            </label>
            <input
              type="date"
              id="fecha_pago"
              value={formData.fecha_pago}
              onChange={(e) =>
                setFormData({ ...formData, fecha_pago: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>

          {/* Monto */}
          <div>
            <label htmlFor="monto" className="block text-sm font-medium text-gray-700 mb-1">
              Monto ($) *
            </label>
            <input
              type="number"
              id="monto"
              value={formData.monto}
              onChange={(e) =>
                setFormData({ ...formData, monto: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="0.00"
              required
              min="0"
              step="0.01"
            />
          </div>

          {/* Método de Pago */}
          <div>
            <label htmlFor="metodo" className="block text-sm font-medium text-gray-700 mb-1">
              Método de Pago
            </label>
            <select
              id="metodo"
              value={formData.metodo}
              onChange={(e) =>
                setFormData({ ...formData, metodo: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="PagoMovil">Pago Móvil</option>
              <option value="Zelle">Zelle</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {/* Referencia */}
          <div>
            <label htmlFor="referencia" className="block text-sm font-medium text-gray-700 mb-1">
              Referencia
            </label>
            <input
              type="text"
              id="referencia"
              value={formData.referencia}
              onChange={(e) =>
                setFormData({ ...formData, referencia: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Número de referencia"
              maxLength={80}
            />
          </div>

          {/* Botones */}
          <div className="flex flex-col md:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full md:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full md:flex-1 px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? "Actualizando..." : "Actualizar Pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
