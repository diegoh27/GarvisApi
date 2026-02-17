import { useState } from "react";
import { X } from "lucide-react";
import { useCreateEnteLegalMutation } from "../../api";

interface CrearEnteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CrearEnteModal({
  isOpen,
  onClose,
}: CrearEnteModalProps) {
  const [createEnte, { isLoading }] = useCreateEnteLegalMutation();

  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validación
    if (!nombre.trim()) {
      setError("El nombre del ente es obligatorio");
      return;
    }
    if (nombre.trim().length > 120) {
      setError("El nombre del ente no puede superar 120 caracteres");
      return;
    }

    try {
      await createEnte({
        nombre_ente: nombre.trim(),
      }).unwrap();

      setSuccess("Ente legal creado exitosamente");
      setTimeout(() => {
        setNombre("");
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.data?.message || "Error al crear el ente legal");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b">
          <h2 className="text-lg md:text-xl font-bold">Crear Ente Legal</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          {/* Nombre Ente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Ente *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={120}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Ej: SENIAT, IVSS, BANAVIH, Alcaldía..."
              required
            />
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
              {isLoading ? "Creando..." : "Crear Ente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
