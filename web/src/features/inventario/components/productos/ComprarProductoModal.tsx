import { useState, useEffect } from "react";
import { useRegistrarCompraMutation, useGetProductoQuery } from "../../api";
import { X } from "lucide-react";

interface ComprarProductoModalProps {
  isOpen: boolean;
  onClose: () => void;
  idProducto: string;
  onSuccess?: () => void;
}

export default function ComprarProductoModal({
  isOpen,
  onClose,
  idProducto,
  onSuccess,
}: ComprarProductoModalProps) {
  const { data: producto } = useGetProductoQuery(idProducto, {
    skip: !isOpen,
  });
  const [registrarCompra, { isLoading }] = useRegistrarCompraMutation();
  const [formData, setFormData] = useState({
    fecha_ingreso: new Date().toISOString().split("T")[0],
    cantidad: "",
    precio_unitario: "",
    precio_total: "",
    proveedor: "",
    referencia: "",
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

      await registrarCompra({
        id: idProducto,
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
      setSuccess("Compra registrada exitosamente");
      setTimeout(() => {
        setFormData({
          fecha_ingreso: new Date().toISOString().split("T")[0],
          cantidad: "",
          precio_unitario: "",
          precio_total: "",
          proveedor: "",
          referencia: "",
        });
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.data?.message || "Error al registrar la compra");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b">
          <h2 className="text-lg md:text-xl font-bold">
            Registrar Compra - {producto?.nombre}
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
          {/* Fecha Ingreso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Ingreso *
            </label>
            <input
              type="date"
              value={formData.fecha_ingreso}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  fecha_ingreso: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad *
            </label>
            <input
              type="number"
              step="1"
              min="1"
              value={formData.cantidad}
              onChange={(e) =>
                setFormData({ ...formData, cantidad: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="1"
              required
            />
          </div>

          {/* Precio Unitario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio Unitario *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.precio_unitario}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  precio_unitario: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="0.00"
              required
            />
          </div>

          {/* Precio Total */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio Total
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.precio_total}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  precio_total: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se calcula automáticamente, pero puedes editarlo
            </p>
          </div>

          {/* Proveedor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proveedor
            </label>
            <input
              type="text"
              value={formData.proveedor}
              onChange={(e) =>
                setFormData({ ...formData, proveedor: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="(Opcional)"
            />
          </div>

          {/* Referencia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referencia
            </label>
            <input
              type="text"
              value={formData.referencia}
              onChange={(e) =>
                setFormData({ ...formData, referencia: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="(Opcional)"
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
