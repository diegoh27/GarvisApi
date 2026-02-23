import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { formatNombreApellido, validarRangoCedula, MENSAJE_RANGO_CEDULA, CedulaField } from "../../../../shared";
import { useCreateEmpleadoMutation } from "../../api/nominaApi";

interface CrearEmpleadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PERIODOS: Array<"Semanal" | "Quincenal" | "Mensual"> = [
  "Semanal",
  "Quincenal",
  "Mensual",
];

type EmpleadoFormState = {
  nombre: string;
  apellido: string;
  tipo_cedula: "V" | "E" | "J" | "P" | "G";
  cedula: string;
  cargo: string;
  periodo: "Semanal" | "Quincenal" | "Mensual";
  sueldo: number;
};

const INITIAL_FORM_STATE: EmpleadoFormState = {
  nombre: "",
  apellido: "",
  tipo_cedula: "V",
  cedula: "",
  cargo: "",
  periodo: "Mensual",
  sueldo: 0,
};

export default function CrearEmpleadoModal({
  isOpen,
  onClose,
  onSuccess,
}: CrearEmpleadoModalProps) {
  const [formData, setFormData] =
    useState<EmpleadoFormState>(INITIAL_FORM_STATE);

  const [error, setError] = useState("");
  const [createEmpleado, { isLoading, isError, error: mutationError }] =
    useCreateEmpleadoMutation();

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

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const newValue = name === "sueldo" ? parseFloat(value) || 0 : value;
    setFormData((prev) => ({
      ...prev,
      [name as keyof EmpleadoFormState]: newValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.nombre.trim()) {
      setError("El nombre es requerido");
      return;
    }
    if (formData.nombre.trim().length > 36) {
      setError("El nombre no puede superar 36 caracteres");
      return;
    }
    if (formData.apellido.trim().length > 36) {
      setError("El apellido no puede superar 36 caracteres");
      return;
    }
    if (formData.cedula.trim() && !/^\d+$/.test(formData.cedula.trim())) {
      setError("La cédula solo puede contener números");
      return;
    }
    if (formData.cedula.trim() && !validarRangoCedula(formData.cedula)) {
      setError(MENSAJE_RANGO_CEDULA);
      return;
    }
    if (!formData.cargo.trim()) {
      setError("El cargo es requerido");
      return;
    }
    if (formData.cargo.trim().length > 80) {
      setError("El cargo no puede superar 80 caracteres");
      return;
    }
    if (formData.sueldo <= 0) {
      setError("El sueldo debe ser mayor a 0");
      return;
    }

    try {
      await createEmpleado({
        ...formData,
        nombre: formatNombreApellido(formData.nombre),
        apellido: formatNombreApellido(formData.apellido),
        cedula: formData.cedula.trim() ? `${formData.tipo_cedula}${formData.cedula.trim()}` : undefined,
        cargo: formData.cargo.trim(),
      }).unwrap();
      setFormData(INITIAL_FORM_STATE);
      onSuccess?.();
      onClose();
    } catch (err) {
      // Error is handled by useEffect
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Crear Empleado
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
              maxLength={36}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Juan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Apellido
            </label>
            <input
              type="text"
              name="apellido"
              value={formData.apellido}
              onChange={handleChange}
              maxLength={36}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Pérez"
            />
          </div>

          <div>
            <CedulaField
              label="Cédula"
              value={`${formData.tipo_cedula}${formData.cedula}`}
              onChange={(tipo, numero) =>
                setFormData((prev) => ({ ...prev, tipo_cedula: tipo, cedula: numero }))
              }
              placeholder="12345678"
              maxLength={9}
              inputClassName="px-3 py-2 border-gray-300 focus:ring-2 focus:ring-teal-500"
              selectClassName="px-3 py-2 border-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cargo *
            </label>
            <input
              type="text"
              name="cargo"
              value={formData.cargo}
              onChange={handleChange}
              maxLength={80}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Cargo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Período
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
              Sueldo *
            </label>
            <input
              type="number"
              name="sueldo"
              value={formData.sueldo || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="50000"
              step="0.01"
              min="0"
            />
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
