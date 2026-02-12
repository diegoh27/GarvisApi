import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { useUpdateContratoMutation } from "../../api/alquilerApi";
import type { AlquilerContrato, UpdateContratoPayload } from "../../api/alquilerApi";

interface EditarContratoModalProps {
  isOpen: boolean;
  contrato: AlquilerContrato | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const PERIODOS: Array<"Mensual" | "Anual" | "Unico"> = [
  "Mensual",
  "Anual",
  "Unico",
];

const ESTADOS: Array<"Pendiente" | "Pagado" | "Vencido"> = [
  "Pendiente",
  "Pagado",
  "Vencido",
];

export default function EditarContratoModal({
  isOpen,
  contrato,
  onClose,
  onSuccess,
}: EditarContratoModalProps) {
  const [formData, setFormData] = useState<UpdateContratoPayload>({
    nombre: "",
    descripcion: "",
    periodo: "Mensual",
    monto: 0,
    fecha_vencimiento: "",
    estado: "Pendiente",
  });

  const [error, setError] = useState("");
  const [updateContrato, { isLoading, isError, error: mutationError }] =
    useUpdateContratoMutation();

  useEffect(() => {
    if (contrato && isOpen) {
      setFormData({
        nombre: contrato.nombre || "",
        descripcion: contrato.descripcion || "",
        periodo: contrato.periodo || "Mensual",
        monto: contrato.monto || 0,
        fecha_vencimiento: contrato.fecha_vencimiento || "",
        estado: contrato.estado || "Pendiente",
      });
      setError("");
    }
  }, [contrato, isOpen]);

  useEffect(() => {
    if (isError && mutationError) {
      const parseError = (err: unknown) => {
        if (err && typeof err === "object" && "data" in err) {
          return (err as any).data?.message || "Error desconocido";
        }
        return "Error desconocido";
      };
      setError(parseError(mutationError));
    }
  }, [isError, mutationError]);

  if (!isOpen || !contrato) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const newValue = name === "monto" ? parseFloat(value) || 0 : value;
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.nombre || !formData.nombre.trim()) {
      setError("El nombre es requerido");
      return;
    }
    if (!formData.periodo) {
      setError("El período es requerido");
      return;
    }
    if (formData.monto === undefined || formData.monto <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }
    if (!formData.fecha_vencimiento) {
      setError("La fecha de vencimiento es requerida");
      return;
    }

    try {
      await updateContrato({
        id: contrato.id_contrato,
        payload: {
          ...formData,
          descripcion: formData.descripcion || null,
        },
      }).unwrap();
      onSuccess?.();
      onClose();
    } catch (err) {
      // Error handled by useEffect
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Editar Contrato
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-2 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              ID: {contrato.id_contrato}
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <input
              type="text"
              name="descripcion"
              value={formData.descripcion || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Período *
            </label>
            <select
              name="periodo"
              value={formData.periodo}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {PERIODOS.map((periodo) => (
                <option key={periodo} value={periodo}>
                  {periodo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto *
            </label>
            <input
              type="number"
              name="monto"
              value={formData.monto || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Vencimiento *
            </label>
            <input
              type="date"
              name="fecha_vencimiento"
              value={formData.fecha_vencimiento || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              name="estado"
              value={formData.estado}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 rounded-lg font-medium transition-colors"
            >
              {isLoading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
