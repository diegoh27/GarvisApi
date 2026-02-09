import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useUpdateObligacionMutation } from "../../api";
import type { Obligacion, UpdateObligacionPayload } from "../../api";

interface EditarObligacionModalProps {
  isOpen: boolean;
  obligacion: Obligacion | null;
  onClose: () => void;
}

export default function EditarObligacionModal({
  isOpen,
  obligacion,
  onClose,
}: EditarObligacionModalProps) {
  const [updateObligacion, { isLoading }] = useUpdateObligacionMutation();

  const [formData, setFormData] = useState({
    concepto: "",
    periodo: "Mensual",
    fecha_vencimiento: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (obligacion && isOpen) {
      const fecha = obligacion.fecha_vencimiento
        ? new Date(obligacion.fecha_vencimiento).toISOString().split('T')[0]
        : "";
      setFormData({
        concepto: obligacion.concepto || "",
        periodo: obligacion.periodo || "Mensual",
        fecha_vencimiento: fecha,
      });
      setError("");
      setSuccess("");
    }
  }, [obligacion, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!obligacion) return;

    // Validación
    if (!formData.concepto.trim()) {
      setError("El concepto es obligatorio");
      return;
    }

    try {
      const payload: UpdateObligacionPayload = {
        concepto: formData.concepto.trim(),
        periodo: formData.periodo,
        ...(formData.fecha_vencimiento && { fecha_vencimiento: formData.fecha_vencimiento }),
      };

      await updateObligacion({
        id: obligacion.id_obligacion,
        payload,
      }).unwrap();

      setSuccess("Obligación actualizada exitosamente");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(
        err?.data?.message || "Error al actualizar la obligación"
      );
    }
  };

  if (!isOpen || !obligacion) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b">
          <h2 className="text-lg md:text-xl font-bold">Editar Obligación</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          {/* Ente (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ente Legal
            </label>
            <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
              {obligacion.nombre_ente}
            </div>
          </div>

          {/* Concepto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concepto *
            </label>
            <input
              type="text"
              value={formData.concepto}
              onChange={(e) =>
                setFormData({ ...formData, concepto: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Ej: IVA, ISLR, Retención..."
              required
            />
          </div>

          {/* Período */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Período
            </label>
            <select
              value={formData.periodo}
              onChange={(e) =>
                setFormData({ ...formData, periodo: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Mensual">Mensual</option>
              <option value="Trimestral">Trimestral</option>
              <option value="Semestral">Semestral</option>
              <option value="Anual">Anual</option>
              <option value="Unico">Único</option>
            </select>
          </div>

          {/* Fecha de Vencimiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Vencimiento
            </label>
            <input
              type="date"
              value={formData.fecha_vencimiento}
              onChange={(e) =>
                setFormData({ ...formData, fecha_vencimiento: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Info: Monto y Fecha (solo lectura) */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800 font-medium mb-2">
              Información de pago:
            </p>
            <div className="space-y-1 text-sm text-blue-700">
              <p>
                <strong>Monto:</strong>{" "}
                {obligacion.monto !== null
                  ? new Intl.NumberFormat("es-VE", {
                    style: "currency",
                    currency: "VES",
                  }).format(obligacion.monto)
                  : "Sin registrar"}
              </p>
              <p>
                <strong>Próximo vencimiento:</strong>{" "}
                {obligacion.fecha_vencimiento !== null
                  ? new Date(obligacion.fecha_vencimiento).toLocaleDateString("es-VE")
                  : "Sin definir"}
              </p>
            </div>
            {(obligacion.monto === null || obligacion.fecha_vencimiento === null) && (
              <p className="text-xs text-blue-600 mt-2 italic">
                * El monto y fecha se establecen al registrar un pago
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
