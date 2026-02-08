import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useUpdateRepresentadoMutation, type Representado } from "../representadosApi";
import Swal from "sweetalert2";

type EditarRepresentadoModalProps = {
  representado: Representado;
  onClose: () => void;
  onSuccess?: () => void;
};

const GENEROS = ["Masculino", "Femenino", "Otro"] as const;

const EditarRepresentadoModal = ({
  representado,
  onClose,
  onSuccess,
}: EditarRepresentadoModalProps) => {
  const [form, setForm] = useState({
    nombre: representado.nombre,
    apellido: representado.apellido,
    cedula: representado.cedula || "",
    fecha_nacimiento: representado.fecha_nacimiento.split("T")[0],
    genero: representado.genero as (typeof GENEROS)[number],
    parentesco: representado.parentesco || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [updateRepresentado, { isLoading }] = useUpdateRepresentadoMutation();

  const clearError = (field: string) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.nombre.trim()) next.nombre = "El nombre es requerido";
    else if (form.nombre.length > 60) next.nombre = "Máximo 60 caracteres";
    if (!form.apellido.trim()) next.apellido = "El apellido es requerido";
    else if (form.apellido.length > 60) next.apellido = "Máximo 60 caracteres";
    if (form.cedula.trim() && form.cedula.length > 20) next.cedula = "Máximo 20 caracteres";
    if (!form.fecha_nacimiento) next.fecha_nacimiento = "La fecha de nacimiento es requerida";
    if (!form.genero) next.genero = "El género es requerido";
    else if (!GENEROS.includes(form.genero)) next.genero = "Género no válido";
    if (form.parentesco.length > 40) next.parentesco = "Máximo 40 caracteres";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate() || isLoading) return;
    try {
      await updateRepresentado({
        id_representado: representado.id_representado,
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        cedula: form.cedula.trim() || null,
        fecha_nacimiento: form.fecha_nacimiento,
        genero: form.genero,
        parentesco: form.parentesco.trim() || null,
      }).unwrap();
      await Swal.fire({
        icon: "success",
        title: "Representado actualizado",
        text: "Los cambios se han guardado correctamente.",
        timer: 2000,
        showConfirmButton: false,
      });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "data" in err
          ? (err as { data?: { message?: string } }).data?.message
          : "No se pudo actualizar el representado";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: message,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-xl bg-paper shadow-lg">
        <div className="flex items-center justify-between border-b border-mist p-4">
          <h2 className="text-lg font-semibold text-brand-900">Editar representado</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-brand-800 hover:bg-cloud"
            aria-label="Cerrar"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="nombre" className="mb-1 block text-sm font-medium text-brand-800">
              Nombre
            </label>
            <input
              id="nombre"
              type="text"
              value={form.nombre}
              onChange={(e) => {
                setForm((f) => ({ ...f, nombre: e.target.value }));
                clearError("nombre");
              }}
              className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-brand-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Ej. María"
              maxLength={60}
              disabled={isLoading}
            />
            {errors.nombre && (
              <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
            )}
          </div>

          <div>
            <label htmlFor="apellido" className="mb-1 block text-sm font-medium text-brand-800">
              Apellido
            </label>
            <input
              id="apellido"
              type="text"
              value={form.apellido}
              onChange={(e) => {
                setForm((f) => ({ ...f, apellido: e.target.value }));
                clearError("apellido");
              }}
              className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-brand-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Ej. Pérez"
              maxLength={60}
              disabled={isLoading}
            />
            {errors.apellido && (
              <p className="mt-1 text-sm text-red-600">{errors.apellido}</p>
            )}
          </div>

          <div>
            <label htmlFor="cedula" className="mb-1 block text-sm font-medium text-brand-800">
              Cédula (opcional)
            </label>
            <input
              id="cedula"
              type="text"
              value={form.cedula}
              onChange={(e) => {
                setForm((f) => ({ ...f, cedula: e.target.value }));
                clearError("cedula");
              }}
              className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-brand-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Ej. V-12345678"
              maxLength={20}
              disabled={isLoading}
            />
            {errors.cedula && (
              <p className="mt-1 text-sm text-red-600">{errors.cedula}</p>
            )}
          </div>

          <div>
            <label htmlFor="fecha_nacimiento" className="mb-1 block text-sm font-medium text-brand-800">
              Fecha de nacimiento
            </label>
            <input
              id="fecha_nacimiento"
              type="date"
              value={form.fecha_nacimiento}
              onChange={(e) => {
                setForm((f) => ({ ...f, fecha_nacimiento: e.target.value }));
                clearError("fecha_nacimiento");
              }}
              className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-brand-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              disabled={isLoading}
            />
            {errors.fecha_nacimiento && (
              <p className="mt-1 text-sm text-red-600">{errors.fecha_nacimiento}</p>
            )}
          </div>

          <div>
            <label htmlFor="genero" className="mb-1 block text-sm font-medium text-brand-800">
              Género
            </label>
            <select
              id="genero"
              value={form.genero}
              onChange={(e) => {
                setForm((f) => ({ ...f, genero: e.target.value as typeof form.genero }));
                clearError("genero");
              }}
              className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-brand-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              disabled={isLoading}
            >
              <option value="">Seleccione</option>
              {GENEROS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            {errors.genero && (
              <p className="mt-1 text-sm text-red-600">{errors.genero}</p>
            )}
          </div>

          <div>
            <label htmlFor="parentesco" className="mb-1 block text-sm font-medium text-brand-800">
              Parentesco (opcional)
            </label>
            <input
              id="parentesco"
              type="text"
              value={form.parentesco}
              onChange={(e) => {
                setForm((f) => ({ ...f, parentesco: e.target.value }));
                clearError("parentesco");
              }}
              className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-brand-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Ej. Hijo, Madre, Padre..."
              maxLength={40}
              disabled={isLoading}
            />
            {errors.parentesco && (
              <p className="mt-1 text-sm text-red-600">{errors.parentesco}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-brand-300 bg-paper px-4 py-2 text-sm font-medium text-brand-800 hover:bg-cloud"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper hover:bg-brand-800 disabled:opacity-50"
            >
              {isLoading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarRepresentadoModal;
