import { useState, useEffect } from "react";
import { useUpdateCompraMutation, type CompraProducto } from "../../api";
import { X } from "lucide-react";

interface EditarCompraModalProps {
  isOpen: boolean;
  onClose: () => void;
  compra: CompraProducto | null;
  onSuccess?: () => void;
}

export default function EditarCompraModal({
  isOpen,
  onClose,
  compra,
  onSuccess,
}: EditarCompraModalProps) {
  const [updateCompra, { isLoading }] = useUpdateCompraMutation();
  const [formData, setFormData] = useState({
    fecha_ingreso: "",
    cantidad: "",
    precio_unitario: "",
    precio_total: "",
    proveedor: "",
    referencia: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Cargar datos de la compra cuando se abre el modal
  useEffect(() => {
    if (isOpen && compra) {
      setFormData({
        fecha_ingreso: compra.fecha_ingreso,
        cantidad: compra.cantidad.toString(),
        precio_unitario: compra.precio_unitario.toString(),
        precio_total: compra.precio_total.toString(),
        proveedor: compra.proveedor || "",
        referencia: compra.referencia || "",
      });
      setError("");
      setSuccess("");
    }
  }, [isOpen, compra]);

  // Calcular precio_total automáticamente
  useEffect(() => {
    const cantidad = parseFloat(formData.cantidad);
    const precioUnitario = parseFloat(formData.precio_unitario);

    if (!isNaN(cantidad) && !isNaN(precioUnitario)) {
      const total = cantidad * precioUnitario;
      setFormData(prev => ({ ...prev, precio_total: total.toFixed(2) }));
    }
  }, [formData.cantidad, formData.precio_unitario]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compra) return;

    setError("");
    setSuccess("");

    // Validación
    if (!formData.fecha_ingreso || !formData.cantidad || formData.precio_unitario === "") {
      setError("Los campos de fecha, cantidad y precio son obligatorios");
      return;
    }

    const cantidad = parseFloat(formData.cantidad);
    const precio = parseFloat(formData.precio_unitario);

    if (cantidad < 1 || !Number.isInteger(cantidad)) {
      setError("La cantidad debe ser un número entero mayor o igual a 1");
      return;
    }

    if (precio < 0) {
      setError("El precio no puede ser negativo");
      return;
    }

    try {
      const precioTotal = parseFloat(formData.precio_total);

      await updateCompra({
        idCompra: compra.id_compra,
        payload: {
          fecha_ingreso: formData.fecha_ingreso,
          cantidad,
          precio_unitario: precio,
          precio_total: !isNaN(precioTotal) ? precioTotal : undefined,
          proveedor: formData.proveedor || undefined,
          referencia: formData.referencia || undefined,
        },
      }).unwrap();

      onSuccess?.();
      setSuccess("Compra actualizada exitosamente");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.data?.message || "Error al actualizar la compra");
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
              Editar Compra
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {compra?.nombre_producto || "Producto"}
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

          {/* Fecha de Ingreso */}
          <div>
            <label htmlFor="fecha_ingreso" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Ingreso *
            </label>
            <input
              type="date"
              id="fecha_ingreso"
              value={formData.fecha_ingreso}
              onChange={(e) =>
                setFormData({ ...formData, fecha_ingreso: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>

          {/* Cantidad y Precio Unitario en Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad *
              </label>
              <input
                type="number"
                id="cantidad"
                value={formData.cantidad}
                onChange={(e) =>
                  setFormData({ ...formData, cantidad: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="0"
                required
                min="1"
                step="1"
              />
            </div>

            <div>
              <label htmlFor="precio_unitario" className="block text-sm font-medium text-gray-700 mb-1">
                Precio Unitario ($) *
              </label>
              <input
                type="number"
                id="precio_unitario"
                value={formData.precio_unitario}
                onChange={(e) =>
                  setFormData({ ...formData, precio_unitario: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="0.00"
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Precio Total (Auto-calculado) */}
          <div>
            <label htmlFor="precio_total" className="block text-sm font-medium text-gray-700 mb-1">
              Precio Total ($)
            </label>
            <input
              type="number"
              id="precio_total"
              value={formData.precio_total}
              onChange={(e) =>
                setFormData({ ...formData, precio_total: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se calcula automáticamente (Cantidad × Precio Unitario)
            </p>
          </div>

          {/* Proveedor y Referencia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="proveedor" className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor
              </label>
              <input
                type="text"
                id="proveedor"
                value={formData.proveedor}
                onChange={(e) =>
                  setFormData({ ...formData, proveedor: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Nombre del proveedor"
                maxLength={120}
              />
            </div>

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
                placeholder="Número de factura, etc."
                maxLength={80}
              />
            </div>
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
              {isLoading ? "Actualizando..." : "Actualizar Compra"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
