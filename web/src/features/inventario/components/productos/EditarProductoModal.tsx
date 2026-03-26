import { useState, useEffect } from "react";
import { useUpdateProductoMutation, useGetProductoQuery } from "../../api";
import { X } from "lucide-react";

interface EditarProductoModalProps {
  isOpen: boolean;
  onClose: () => void;
  idProducto: string;
}

export default function EditarProductoModal({
  isOpen,
  onClose,
  idProducto,
}: EditarProductoModalProps) {
  const { data: producto } = useGetProductoQuery(idProducto, {
    skip: !isOpen,
  });
  const [updateProducto, { isLoading }] = useUpdateProductoMutation();
  const [formData, setFormData] = useState({
    nombre: "",
    presentacion: "",
    contenido: "1",
    unidad_medida: "",
    categoria: "General",
    activo: true,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Cargar datos del producto cuando se abre el modal
  useEffect(() => {
    if (producto) {
      setFormData({
        nombre: producto.nombre,
        presentacion: producto.presentacion || "",
        contenido: String(producto.contenido || 1),
        unidad_medida: producto.unidad_medida || "",
        categoria: producto.categoria || "General",
        activo: producto.activo === 1,
      });
    }
  }, [producto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validación
    if (!formData.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (formData.nombre.trim().length > 120) {
      setError("El nombre del producto no puede superar 120 caracteres");
      return;
    }

    try {
      await updateProducto({
        id: idProducto,
        payload: {
          nombre: formData.nombre.trim(),
          presentacion: formData.presentacion.trim() || undefined,
          contenido: Number(formData.contenido) || 1,
          unidad_medida: formData.unidad_medida.trim() || undefined,
          categoria: formData.categoria,
          activo: formData.activo ? 1 : 0,
        },
      }).unwrap();

      setSuccess("Producto actualizado exitosamente");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.data?.message || "Error al actualizar el producto");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b">
          <h2 className="text-lg md:text-xl font-bold">Editar Producto</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Producto *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              maxLength={120}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Ej: Guantes de látex"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Presentación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Presentación
              </label>
              <input
                type="text"
                value={formData.presentacion}
                onChange={(e) =>
                  setFormData({ ...formData, presentacion: e.target.value })
                }
                maxLength={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ej: Galón, Caja"
              />
            </div>

            {/* Equivalencia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" title="Cuánto contiene una presentación">
                Equivalencia
              </label>
              <input
                type="number"
                step="any"
                min="0.0001"
                value={formData.contenido}
                onChange={(e) =>
                  setFormData({ ...formData, contenido: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ej: 3800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Unidad Medida */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidad de Medida
              </label>
              <input
                type="text"
                value={formData.unidad_medida}
                onChange={(e) =>
                  setFormData({ ...formData, unidad_medida: e.target.value })
                }
                maxLength={30}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ej: ml, mg, pzas"
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={formData.categoria}
                onChange={(e) =>
                  setFormData({ ...formData, categoria: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="General">General</option>
                <option value="Insumos Médicos">Insumos Médicos</option>
                <option value="Medicamentos">Medicamentos</option>
                <option value="Equipos">Equipos</option>
                <option value="Descartables">Descartables</option>
                <option value="Diagnóstico">Diagnóstico</option>
                <option value="Instrumental">Instrumental</option>
                <option value="Líquidos">Líquidos</option>
              </select>
            </div>
          </div>

          {/* Activo */}
          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="activo"
              checked={formData.activo}
              onChange={(e) =>
                setFormData({ ...formData, activo: e.target.checked })
              }
              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
            />
            <label
              htmlFor="activo"
              className="ml-2 text-sm font-medium text-gray-700"
            >
              Producto activo
            </label>
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
              {isLoading ? "Actualizando..." : "Actualizar Producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
