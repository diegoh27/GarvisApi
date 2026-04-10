import { useState, useEffect } from "react";
import { useRegistrarAjusteMutation, useGetProductoQuery } from "../../api";
import { X, MinusCircle } from "lucide-react";

interface ConsumoManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  idProducto: string;
  onSuccess?: () => void;
}

export default function ConsumoManualModal({
  isOpen,
  onClose,
  idProducto,
  onSuccess,
}: ConsumoManualModalProps) {
  const { data: producto } = useGetProductoQuery(idProducto, {
    skip: !isOpen,
  });
  const [registrarAjuste, { isLoading }] = useRegistrarAjusteMutation();
  const [formData, setFormData] = useState({
    cantidad_consumida: "",
    motivo: "Consumo manual (ajuste interno)",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccess("");
      setFormData({
        cantidad_consumida: "",
        motivo: "Consumo manual (ajuste interno)",
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.cantidad_consumida === "") {
      setError("La cantidad consumida es obligatoria");
      return;
    }

    const cantidadRebajar = Number(formData.cantidad_consumida);

    if (cantidadRebajar <= 0 || Number.isNaN(cantidadRebajar)) {
      setError("La cantidad consumida debe ser mayor a 0");
      return;
    }
    if (formData.motivo.trim().length > 500) {
      setError("El motivo no puede superar 500 caracteres");
      return;
    }

    if (!producto) return;

    const stockActual = Number(producto.stock_base_total);
    const nuevoStock = stockActual - cantidadRebajar;

    if (nuevoStock < 0) {
      setError("El consumo excede el stock actual disponible");
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
      setSuccess("Consumo registrado exitosamente");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.data?.message || "Error al registrar el consumo");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-5 flex justify-between items-center border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-rose-100 text-rose-600 p-2 rounded-lg">
              <MinusCircle size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Consumo Manual
              </h2>
              <p className="text-xs text-gray-500 font-medium">Extraer stock de forma directa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 lg:space-y-6">
          {/* Stock Actual */}
          {producto && (
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-600">Stock Actual Disponible:</span>
              <span className="text-sm font-bold text-gray-900">
                {Number(producto.stock_base_total)} {producto.unidad_consumo || "u"}
              </span>
            </div>
          )}

          {/* Cantidad Retirar */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Cantidad a descontar *
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0"
                value={formData.cantidad_consumida}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cantidad_consumida: e.target.value,
                  })
                }
                className="w-full pl-4 pr-16 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-shadow"
                placeholder="Ej: 5"
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                 {producto?.unidad_consumo || "U"}
              </div>
            </div>
            {formData.cantidad_consumida && producto && (
              <p className="text-xs font-medium text-rose-600 mt-2">
                Quedará en inventario: {Math.max(0, Number(producto.stock_base_total) - Number(formData.cantidad_consumida))} {producto.unidad_consumo || "u"}
              </p>
            )}
          </div>

          {/* Motivo */}
          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Motivo u Observación
            </label>
            <textarea
              value={formData.motivo}
              onChange={(e) =>
                setFormData({ ...formData, motivo: e.target.value })
              }
              maxLength={500}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-shadow text-sm"
              placeholder="(Opcional) Especificar por qué se descuenta manualmente"
              rows={2}
            />
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
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-75 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <MinusCircle size={16} />
              {isLoading ? "Descontando..." : "Descontar stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
