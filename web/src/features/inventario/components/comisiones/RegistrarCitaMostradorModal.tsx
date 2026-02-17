import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useGetEcosByEspecialistaQuery } from "../../../ecos/ecosApi";
import { useGetDolarOficialQuery } from "../../../dolar/dolarApi";
import { calculateRIF, formatNombreApellido, validarRangoCedula, MENSAJE_RANGO_CEDULA, CedulaField } from "../../../../shared";
import type { EspecialistaInventario } from "../../api/especialistasApi";
import { sanitizeMonto, validarMonto } from "../../utils/validation";

const METODOS: Array<"Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro"> = [
  "Efectivo",
  "Transferencia",
  "PagoMovil",
  "Zelle",
  "Otro",
];

type Props = {
  especialistas: EspecialistaInventario[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: {
    id_especialista: string;
    id_eco: string;
    fecha_cita: string;
    metodo: "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro";
    monto: number;
    tasa_dia_bcv: number;
    nombre: string;
    apellido: string;
    cedula: string;
    rif?: string;
    referencia?: string;
  }) => Promise<void>;
};

export default function RegistrarCitaMostradorModal({
  especialistas,
  isSaving,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState({
    id_especialista: "",
    id_eco: "",
    fecha_cita: new Date().toISOString().slice(0, 10),
    metodo: "Transferencia" as "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro",
    monto: "",
    tasa_dia_bcv: "",
    nombre: "",
    apellido: "",
    tipo_cedula: "V",
    cedula: "",
    rif_tipo: "V",
    referencia: "",
  });
  const [error, setError] = useState("");

  const { data: dolarOficial, isLoading: loadingDolar } = useGetDolarOficialQuery();

  useEffect(() => {
    if (!form.tasa_dia_bcv && dolarOficial?.promedio) {
      setForm((prev) => ({
        ...prev,
        tasa_dia_bcv: String(dolarOficial.promedio),
      }));
    }
  }, [dolarOficial, form.tasa_dia_bcv]);

  const { data: ecos = [], isLoading: loadingEcos } = useGetEcosByEspecialistaQuery(
    form.id_especialista,
    { skip: !form.id_especialista },
  );

  const selectedEco = useMemo(
    () => ecos.find((eco) => eco.id_eco === form.id_eco),
    [ecos, form.id_eco],
  );

  const isMetodoEnBs = form.metodo === "Transferencia" || form.metodo === "PagoMovil";

  useEffect(() => {
    if (!selectedEco) return;

    const ecoPrecioUsd = Number(selectedEco.precio || 0);
    if (!Number.isFinite(ecoPrecioUsd) || ecoPrecioUsd <= 0) return;

    if (isMetodoEnBs) {
      const tasa = Number(form.tasa_dia_bcv);
      if (!Number.isFinite(tasa) || tasa <= 0) return;
      const calculadoBs = (ecoPrecioUsd * tasa).toFixed(2);
      setForm((prev) => ({ ...prev, monto: calculadoBs }));
      return;
    }

    setForm((prev) => ({ ...prev, monto: ecoPrecioUsd.toFixed(2) }));
  }, [selectedEco, isMetodoEnBs, form.tasa_dia_bcv]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      id_eco: "",
    }));
  }, [form.id_especialista]);

  const rifCalculado = useMemo(
    () => calculateRIF(form.rif_tipo, form.cedula),
    [form.rif_tipo, form.cedula],
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const nextValue = name === "monto" ? sanitizeMonto(value) : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.id_especialista || !form.id_eco || !form.fecha_cita || !form.nombre || !form.apellido || !form.cedula) {
      setError("Completa los campos obligatorios.");
      return;
    }
    if (form.nombre.trim().length > 36) {
      setError("El nombre no puede superar 36 caracteres.");
      return;
    }
    if (form.apellido.trim().length > 36) {
      setError("El apellido no puede superar 36 caracteres.");
      return;
    }
    if (!/^\d+$/.test(form.cedula.trim())) {
      setError("La cédula solo puede contener números.");
      return;
    }
    if (!validarRangoCedula(form.cedula)) {
      setError(MENSAJE_RANGO_CEDULA);
      return;
    }
    if (form.referencia.trim().length > 80) {
      setError("La referencia no puede superar 80 caracteres.");
      return;
    }

    const errMonto = validarMonto(form.monto);
    if (errMonto) {
      setError(errMonto);
      return;
    }
    const monto = Number(form.monto);
    const tasa = Number(form.tasa_dia_bcv);
    if (isMetodoEnBs && (!Number.isFinite(tasa) || tasa <= 0)) {
      setError("La tasa BCV debe ser mayor a 0.");
      return;
    }

    const tasaFinal =
      Number.isFinite(tasa) && tasa > 0
        ? tasa
        : Number(dolarOficial?.promedio) > 0
          ? Number(dolarOficial?.promedio)
          : 1;

    await onSave({
      id_especialista: form.id_especialista,
      id_eco: form.id_eco,
      fecha_cita: form.fecha_cita,
      metodo: form.metodo,
      monto,
      tasa_dia_bcv: tasaFinal,
      nombre: formatNombreApellido(form.nombre),
      apellido: formatNombreApellido(form.apellido),
      cedula: `${form.tipo_cedula}${form.cedula}`.trim(),
      rif: rifCalculado || undefined,
      referencia: form.referencia.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Registrar cita de mostrador</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" type="button">
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4 px-6 py-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Especialista *</label>
              <select
                name="id_especialista"
                value={form.id_especialista}
                onChange={handleChange}
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                required
              >
                <option value="">Selecciona especialista</option>
                {especialistas.map((esp) => (
                  <option key={esp.id_especialista} value={esp.id_especialista}>
                    {esp.nombre} {esp.apellido}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Eco *</label>
              <select
                name="id_eco"
                value={form.id_eco}
                onChange={handleChange}
                disabled={!form.id_especialista || loadingEcos}
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm disabled:opacity-50"
                required
              >
                <option value="">{loadingEcos ? "Cargando..." : "Selecciona eco"}</option>
                {ecos.map((eco) => (
                  <option key={eco.id_eco} value={eco.id_eco}>
                    {eco.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fecha *</label>
              <input
                type="date"
                name="fecha_cita"
                value={form.fecha_cita}
                onChange={handleChange}
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Método de pago *</label>
              <select
                name="metodo"
                value={form.metodo}
                onChange={handleChange}
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                required
              >
                {METODOS.map((metodo) => (
                  <option key={metodo} value={metodo}>
                    {metodo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Monto ({isMetodoEnBs ? "Bs" : "$"}) *
              </label>
              <input
                type="number"
                name="monto"
                value={form.monto}
                onChange={handleChange}
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                min="0"
                step="0.01"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Calculado automáticamente según eco y método de pago. Puedes editarlo.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tasa BCV del día *</label>
              <input
                type="number"
                name="tasa_dia_bcv"
                value={form.tasa_dia_bcv}
                onChange={handleChange}
                disabled={!isMetodoEnBs}
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                min="0"
                step="0.0001"
                required={isMetodoEnBs}
              />
              <p className="mt-1 text-xs text-gray-500">
                {isMetodoEnBs
                  ? loadingDolar
                    ? "Consultando tasa..."
                    : dolarOficial
                      ? `Sugerida: ${dolarOficial.promedio}`
                      : "No disponible"
                  : "No aplica para este método (monto en USD)."}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Referencia (opcional)</label>
              <input
                type="text"
                name="referencia"
                value={form.referencia}
                onChange={handleChange}
                maxLength={80}
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                placeholder="Se genera automática si la dejas vacía"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                maxLength={36}
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Apellido *</label>
              <input
                type="text"
                name="apellido"
                value={form.apellido}
                onChange={handleChange}
                maxLength={36}
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                required
              />
            </div>
            <div>
              <CedulaField
                label="Cédula *"
                value={`${form.tipo_cedula}${form.cedula}`}
                onChange={(tipo, numero) =>
                  setForm((prev) => ({ ...prev, tipo_cedula: tipo, cedula: numero }))
                }
                required
                inputClassName="h-10 rounded-md border-gray-300 text-sm"
                selectClassName="h-10 rounded-md border-gray-300 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo RIF</label>
              <select
                name="rif_tipo"
                value={form.rif_tipo}
                onChange={handleChange}
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
              >
                <option value="V">V</option>
                <option value="E">E</option>
                <option value="J">J</option>
                <option value="P">P</option>
                <option value="G">G</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">RIF calculado</label>
              <input
                type="text"
                value={rifCalculado}
                readOnly
                className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : "Registrar cita"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
