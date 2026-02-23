import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { EspecialistaInventario } from "../../api/especialistasApi";
import type { Especialidad } from "../../../especialidades/especialidadesApi";

type EditarEspecialistaModalProps = {
  especialista: EspecialistaInventario;
  especialidades: Especialidad[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: { id_especialidad: string; porcentaje: number }) => Promise<void>;
};

export default function EditarEspecialistaModal({
  especialista,
  especialidades,
  isSaving,
  onClose,
  onSave,
}: EditarEspecialistaModalProps) {
  const [idEspecialidad, setIdEspecialidad] = useState(especialista.id_especialidad || "");
  const [porcentaje, setPorcentaje] = useState(
    especialista.porcentaje !== null && especialista.porcentaje !== undefined
      ? String(especialista.porcentaje)
      : "0",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    setIdEspecialidad(especialista.id_especialidad || "");
    setPorcentaje(
      especialista.porcentaje !== null && especialista.porcentaje !== undefined
        ? String(especialista.porcentaje)
        : "0",
    );
    setError("");
  }, [especialista]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!idEspecialidad) {
      setError("Debes seleccionar una especialidad.");
      return;
    }

    const porcentajeNum = Number(porcentaje);
    if (Number.isNaN(porcentajeNum) || porcentajeNum < 1 || porcentajeNum > 100) {
      setError("El porcentaje debe estar entre 1 y 100.");
      return;
    }

    await onSave({ id_especialidad: idEspecialidad, porcentaje: porcentajeNum });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Editar especialista</h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            {especialista.nombre} {especialista.apellido}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Especialidad</label>
            <select
              value={idEspecialidad}
              onChange={(e) => {
                setIdEspecialidad(e.target.value);
                setError("");
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              disabled={isSaving}
            >
              <option value="">Selecciona una especialidad</option>
              {especialidades.map((esp) => (
                <option key={esp.id_especialidad} value={esp.id_especialidad}>
                  {esp.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Porcentaje de comisión</label>
            <input
              type="number"
              min={1}
              max={100}
              step="0.01"
              value={porcentaje}
              onChange={(e) => {
                setPorcentaje(e.target.value);
                setError("");
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              disabled={isSaving}
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
