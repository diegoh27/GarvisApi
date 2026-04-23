import { useState } from "react";
import { X } from "lucide-react";
import { useCreateObligacionMutation, useGetEntesLegalesQuery } from "../../api";
import type { CreateObligacionPayload } from "../../api";

interface CrearObligacionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CrearObligacionModal({
  isOpen,
  onClose,
}: CrearObligacionModalProps) {
  const [createObligacion, { isLoading }] = useCreateObligacionMutation();
  const { data: entes = [] } = useGetEntesLegalesQuery();

  const [formData, setFormData] = useState({
    id_ente: "",
    concepto: "",
    periodo: "Mensual",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validación
    if (!formData.id_ente.trim()) {
      setError("Debe seleccionar un ente legal");
      return;
    }

    if (!formData.concepto.trim()) {
      setError("El concepto es obligatorio");
      return;
    }
    if (formData.concepto.trim().length > 200) {
      setError("El concepto no puede superar 200 caracteres");
      return;
    }

    try {
      const payload: CreateObligacionPayload = {
        id_ente: formData.id_ente,
        concepto: formData.concepto.trim(),
        periodo: formData.periodo,
        estado: "Pendiente",
      };

      await createObligacion(payload).unwrap();

      setSuccess("Obligación creada exitosamente");
      setTimeout(() => {
        setFormData({
          id_ente: "",
          concepto: "",
          periodo: "Mensual",
        });
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(
        err?.data?.message || "Error al crear la obligación"
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b">
          <h2 className="text-lg md:text-xl font-bold">Crear Obligación</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          {/* Ente Legal */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">
              Ente Legal *
            </label>
            <select
              value={formData.id_ente}
              onChange={(e) =>
                setFormData({ ...formData, id_ente: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            >
              <option value="">Seleccionar ente...</option>
              {entes.map((ente) => (
                <option key={ente.id_ente} value={ente.id_ente}>
                  {ente.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Concepto */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">
              Concepto *
            </label>
            <input
              type="text"
              value={formData.concepto}
              onChange={(e) =>
                setFormData({ ...formData, concepto: e.target.value })
              }
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Ej: IVA, ISLR, Retención..."
              required
            />
          </div>

          {/* Período */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">
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

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-base text-red-600">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-base text-green-600">{success}</p>
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
              {isLoading ? "Creando..." : "Crear Obligación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
