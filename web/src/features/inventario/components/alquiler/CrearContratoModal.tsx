import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { useCreateContratoMutation } from "../../api/alquilerApi";
import { toDateKey } from "../../../../shared";
import { MONTO_MIN, MONTO_MAX, sanitizeMonto, validarMonto } from "../../utils/validation";

interface CrearContratoModalProps {
  isOpen: boolean;
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

type ContratoFormState = {
  nombre: string;
  descripcion: string;
  periodo: "Mensual" | "Anual" | "Unico";
  monto: number;
  fecha_vencimiento: string;
  estado: "Pendiente" | "Pagado" | "Vencido";
};

const INITIAL_FORM_STATE: ContratoFormState = {
  nombre: "",
  descripcion: "",
  periodo: "Mensual",
  monto: 0,
  fecha_vencimiento: toDateKey(new Date()),
  estado: "Pendiente",
};

export default function CrearContratoModal({
  isOpen,
  onClose,
  onSuccess,
}: CrearContratoModalProps) {
  const [formData, setFormData] = useState<ContratoFormState>(
    INITIAL_FORM_STATE,
  );

  const [error, setError] = useState("");
  const [createContrato, { isLoading, isError, error: mutationError }] =
    useCreateContratoMutation();

  const parseErrorMessage = (err: unknown) => {
    if (!err) return "Error desconocido";
    if (typeof err === "object" && err !== null) {
      if (
        "data" in err &&
        err.data &&
        typeof (err.data as any).message === "string"
      ) {
        return (err.data as any).message;
      }
      if ("error" in err && typeof (err as any).error === "string") {
        return (err as any).error;
      }
      if ("message" in err && typeof (err as any).message === "string") {
        return (err as any).message;
      }
    }
    return "Error desconocido";
  };

  useEffect(() => {
    if (isError && mutationError) {
      setError(parseErrorMessage(mutationError));
    }
  }, [isError, mutationError]);

  useEffect(() => {
    if (isOpen) {
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    let newValue: string | number = value;
    if (name === "monto") {
      const sanitized = sanitizeMonto(value);
      const num = parseFloat(sanitized);
      newValue = Number.isFinite(num) ? num : 0;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.nombre.trim()) {
      setError("El nombre es requerido");
      return;
    }
    if (formData.nombre.trim().length > 120) {
      setError("El nombre no puede superar 120 caracteres");
      return;
    }
    if (formData.descripcion.trim().length > 500) {
      setError("La descripción no puede superar 500 caracteres");
      return;
    }
    if (!formData.periodo) {
      setError("El período es requerido");
      return;
    }
    const errMonto = validarMonto(formData.monto);
    if (errMonto) {
      setError(errMonto);
      return;
    }
    if (!formData.fecha_vencimiento) {
      setError("La fecha de vencimiento es requerida");
      return;
    }

    try {
      await createContrato({
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || undefined,
        periodo: formData.periodo,
        monto: formData.monto,
        fecha_vencimiento: formData.fecha_vencimiento,
        estado: formData.estado,
      }).unwrap();
      setFormData(INITIAL_FORM_STATE);
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
            Crear Contrato
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              maxLength={120}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Contrato de local"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <input
              type="text"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Detalle adicional"
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
              Monto ($) *
            </label>
            <input
              type="number"
              name="monto"
              value={formData.monto || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="0.01"
              step="0.01"
              min={MONTO_MIN}
              max={MONTO_MAX}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Vencimiento *
            </label>
            <input
              type="date"
              name="fecha_vencimiento"
              value={formData.fecha_vencimiento}
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
              {isLoading ? "Creando..." : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
