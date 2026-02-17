import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { formatNombreApellido, validarRangoCedula, MENSAJE_RANGO_CEDULA, CedulaField, parseCedulaDisplay } from "../../../../shared";
import { useUpdateEmpleadoMutation } from "../../api/nominaApi";
import type { Empleado, UpdateEmpleadoPayload } from "../../api/nominaApi";

interface EditarEmpleadoModalProps {
  isOpen: boolean;
  empleado: Empleado | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const PERIODOS: Array<"Semanal" | "Quincenal" | "Mensual"> = [
  "Semanal",
  "Quincenal",
  "Mensual",
];
const ESTADOS: Array<"Activo" | "Inactivo"> = ["Activo", "Inactivo"];
const ESTATUS_PAGO_MANUAL: Array<{
  label: string;
  value: "" | "Pendiente" | "Pagada";
}> = [
    { label: "Auto", value: "" },
    { label: "Pendiente", value: "Pendiente" },
    { label: "Pagada", value: "Pagada" },
  ];

export default function EditarEmpleadoModal({
  isOpen,
  empleado,
  onClose,
  onSuccess,
}: EditarEmpleadoModalProps) {
  const [formData, setFormData] = useState<UpdateEmpleadoPayload & { tipo_cedula?: "V" | "E" | "J" | "P" | "G" }>({
    nombre: "",
    apellido: "",
    tipo_cedula: "V",
    cedula: "",
    cargo: "",
    periodo: "Mensual",
    sueldo: 0,
    estado: "Activo",
    proximo_pago_manual: null,
    estatus_pago_manual: null,
  });

  const [error, setError] = useState("");
  const [updateEmpleado, { isLoading, isError, error: mutationError }] =
    useUpdateEmpleadoMutation();

  useEffect(() => {
    if (empleado && isOpen) {
      const parsed = parseCedulaDisplay(empleado.cedula);
      setFormData({
        nombre: empleado.nombre || "",
        apellido: empleado.apellido || "",
        tipo_cedula: parsed.tipo,
        cedula: parsed.numero,
        cargo: empleado.cargo || "",
        periodo: empleado.periodo || "Mensual",
        sueldo: empleado.sueldo || 0,
        estado: empleado.estado || "Activo",
        proximo_pago_manual: empleado.proximo_pago_manual || null,
        estatus_pago_manual: empleado.estatus_pago_manual || null,
      });
      setError("");
    }
  }, [empleado, isOpen]);

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

  if (!isOpen || !empleado) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    let newValue: string | number | null = value;

    if (name === "sueldo") {
      newValue = parseFloat(value) || 0;
    }
    if (name === "proximo_pago_manual" || name === "estatus_pago_manual") {
      newValue = value ? value : null;
    }

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
    if (formData.nombre.trim().length > 36) {
      setError("El nombre no puede superar 36 caracteres");
      return;
    }
    if ((formData.apellido || "").trim().length > 36) {
      setError("El apellido no puede superar 36 caracteres");
      return;
    }
    if (formData.cedula && !/^\d+$/.test(String(formData.cedula).trim())) {
      setError("La cédula solo puede contener números");
      return;
    }
    if (formData.cedula && !validarRangoCedula(String(formData.cedula))) {
      setError(MENSAJE_RANGO_CEDULA);
      return;
    }
    if (!formData.cargo || !formData.cargo.trim()) {
      setError("El cargo es requerido");
      return;
    }
    if (formData.cargo.trim().length > 80) {
      setError("El cargo no puede superar 80 caracteres");
      return;
    }
    if (formData.sueldo === undefined || formData.sueldo <= 0) {
      setError("El sueldo debe ser mayor a 0");
      return;
    }

    if (!empleado) {
      setError("Empleado no encontrado");
      return;
    }

    try {
      await updateEmpleado({
        id: empleado.id_empleado,
        payload: {
          ...formData,
          nombre: formatNombreApellido(formData.nombre),
          apellido: formData.apellido ? formatNombreApellido(formData.apellido) : formData.apellido,
          cedula: formData.cedula?.trim()
            ? `${formData.tipo_cedula ?? "V"}${formData.cedula.trim()}`
            : formData.cedula ?? undefined,
          cargo: formData.cargo.trim(),
        },
      }).unwrap();
      onSuccess?.();
      onClose();
    } catch (err) {
      // Error is handled by useEffect
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">
            Editar Empleado
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
              ID: {empleado.id_empleado}
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
              value={`${formData.tipo_cedula ?? "V"}${formData.cedula ?? ""}`}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Próx. pago (manual)
            </label>
            <input
              type="date"
              name="proximo_pago_manual"
              value={formData.proximo_pago_manual || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estatus pago (manual)
            </label>
            <select
              name="estatus_pago_manual"
              value={formData.estatus_pago_manual || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {ESTATUS_PAGO_MANUAL.map((estatus) => (
                <option key={estatus.label} value={estatus.value}>
                  {estatus.label}
                </option>
              ))}
            </select>
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
