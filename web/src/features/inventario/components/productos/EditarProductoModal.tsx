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
    categoria: "General",
    unidad_compra: "",
    unidad_consumo: "",
    factor_conversion: "1",
    stock_minimo_base: "0",
    activo: true,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (producto) {
      setFormData({
        nombre: producto.nombre,
        presentacion: producto.presentacion || "",
        categoria: producto.categoria || "General",
        unidad_compra: producto.unidad_compra || "",
        unidad_consumo: producto.unidad_consumo || "",
        factor_conversion: String(producto.factor_conversion || 1),
        stock_minimo_base: String(producto.stock_minimo_base || 0),
        activo: producto.activo === 1,
      });
    }
  }, [producto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (formData.nombre.trim().length > 120) {
      setError("El nombre del producto no puede superar 120 caracteres");
      return;
    }
    const fConv = Number(formData.factor_conversion);
    if (!Number.isFinite(fConv) || fConv <= 0) {
      setError("El factor de conversión debe ser numérico y mayor a 0");
      return;
    }
    if (!formData.unidad_compra.trim() || !formData.unidad_consumo.trim()) {
      setError("Las unidades de compra y consumo son obligatorias");
      return;
    }
    const minStock = Number(formData.stock_minimo_base);
    if (!Number.isFinite(minStock) || minStock < 0) {
      setError("El stock mínimo base debe ser un número igual o mayor a 0");
      return;
    }

    try {
      await updateProducto({
        id: idProducto,
        payload: {
          nombre: formData.nombre.trim(),
          presentacion: formData.presentacion.trim() || undefined,
          categoria: formData.categoria,
          unidad_compra: formData.unidad_compra.trim() || undefined,
          unidad_consumo: formData.unidad_consumo.trim() || undefined,
          factor_conversion: fConv,
          stock_minimo_base: minStock,
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

  const inputClassName =
    "w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-gray-400 transition-shadow";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 pb-2">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-teal-600">
                Editar Registro
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-1">
                Modificar Producto
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Actualice la información del insumo en el inventario.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mr-1 -mt-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-5">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Nombre del Producto *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              maxLength={120}
              className={inputClassName}
              placeholder="Ej: Guantes de látex"
              required
            />
          </div>

          {/* Presentación + Unidad de Compra */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Presentación
              </label>
              <input
                type="text"
                value={formData.presentacion}
                onChange={(e) =>
                  setFormData({ ...formData, presentacion: e.target.value })
                }
                maxLength={50}
                className={inputClassName}
                placeholder="Ej: Galón, Caja"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Unidad de Compra *
              </label>
              <input
                type="text"
                value={formData.unidad_compra}
                onChange={(e) =>
                  setFormData({ ...formData, unidad_compra: e.target.value })
                }
                maxLength={50}
                className={inputClassName}
                placeholder="Ej: Caja, Galón"
                required
              />
            </div>
          </div>

          {/* Unidad de Consumo + Factor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Unidad de Consumo *
              </label>
              <input
                type="text"
                value={formData.unidad_consumo}
                onChange={(e) =>
                  setFormData({ ...formData, unidad_consumo: e.target.value })
                }
                maxLength={50}
                className={inputClassName}
                placeholder="Ej: Piezas, ml"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Factor de Conversión *
              </label>
              <input
                type="number"
                step="any"
                min="0.0001"
                value={formData.factor_conversion}
                onChange={(e) =>
                  setFormData({ ...formData, factor_conversion: e.target.value })
                }
                className={inputClassName}
                placeholder="Ej: 50, 100"
                required
              />
            </div>
          </div>

          {/* Categoría + Mínimo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Categoría
              </label>
              <select
                value={formData.categoria}
                onChange={(e) =>
                  setFormData({ ...formData, categoria: e.target.value })
                }
                className={`${inputClassName} bg-white appearance-none`}
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
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Mínimo ({formData.unidad_consumo || "base"})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formData.stock_minimo_base}
                onChange={(e) =>
                  setFormData({ ...formData, stock_minimo_base: e.target.value })
                }
                className={inputClassName}
                placeholder="0"
              />
            </div>
          </div>

          {/* Activo */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="activo-editar"
              checked={formData.activo}
              onChange={(e) =>
                setFormData({ ...formData, activo: e.target.checked })
              }
              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
            />
            <label
              htmlFor="activo-editar"
              className="ml-2 text-sm font-medium text-gray-700"
            >
              Producto activo
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm disabled:bg-teal-300 disabled:cursor-not-allowed"
            >
              {isLoading ? "Actualizando..." : "Actualizar Producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
