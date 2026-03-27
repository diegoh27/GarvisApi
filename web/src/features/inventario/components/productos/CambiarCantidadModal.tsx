import { useState, useEffect } from "react";
import { useRegistrarAjusteMutation, useGetProductoQuery } from "../../api";
import { X } from "lucide-react";

interface CambiarCantidadModalProps {
  isOpen: boolean;
  onClose: () => void;
  idProducto: string;
  onSuccess?: () => void;
}

export default function CambiarCantidadModal({
  isOpen,
  onClose,
  idProducto,
  onSuccess,
}: CambiarCantidadModalProps) {
  const { data: producto } = useGetProductoQuery(idProducto, {
    skip: !isOpen,
  });
  const [registrarAjuste, { isLoading }] = useRegistrarAjusteMutation();
  const [formData, setFormData] = useState({
    stock_nuevo: "",
    motivo: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Limpiar mensajes cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccess("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validación
    if (formData.stock_nuevo === "") {
      setError("La cantidad es obligatoria");
      return;
    }

    const nuevoStock = Number(formData.stock_nuevo);

    if (nuevoStock < 0 || Number.isNaN(nuevoStock)) {
      setError("La cantidad debe ser un número mayor o igual a 0");
      return;
    }
    if (formData.motivo.trim().length > 500) {
      setError("El motivo no puede superar 500 caracteres");
      return;
    }

    try {
      await registrarAjuste({
        id: idProducto,
        payload: {
          stock_nuevo: nuevoStock,
          motivo: formData.motivo || undefined,
        },
      }).unwrap();

      onSuccess?.();
      setSuccess("Ajuste registrado exitosamente");
      setTimeout(() => {
        setFormData({
          stock_nuevo: "",
          motivo: "",
        });
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.data?.message || "Error al registrar el ajuste");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b">
          <h2 className="text-lg md:text-xl font-bold">
            Cambiar Cantidad - {producto?.nombre}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          {/* Stock Actual */}
          {producto && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Stock Actual:</strong> {Number(producto.stock_base_total)} {producto.unidad_consumo || "base"}
              </p>
            </div>
          )}

          {/* Stock Nuevo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad Nueva *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={formData.stock_nuevo}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  stock_nuevo: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="0"
              required
            />
            {formData.stock_nuevo && producto && (
              <p className="text-sm text-gray-600 mt-2">
                Cambio: {Number(formData.stock_nuevo) - Number(producto.stock_base_total) > 0 ? "+" : ""}
                {(Number(formData.stock_nuevo) - Number(producto.stock_base_total)).toFixed(4).replace(/\.?0+$/, "")} {producto.unidad_consumo || "base"}
              </p>
            )}
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo del Ajuste
            </label>
            <textarea
              value={formData.motivo}
              onChange={(e) =>
                setFormData({ ...formData, motivo: e.target.value })
              }
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="(Opcional) Ej: Faltante encontrado, Error de conteo, etc."
              rows={3}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
              {success}
            </div>
          )}

          {/* Buttons */}
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
              className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors disabled:bg-teal-300 disabled:cursor-not-allowed"
            >
              {isLoading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
