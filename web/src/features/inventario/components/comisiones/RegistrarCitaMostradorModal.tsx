import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useGetEcosByEspecialistaQuery } from "../../../ecos/ecosApi";
import { useGetDolarOficialQuery } from "../../../dolar/dolarApi";
import { useLazyGetUltimoPacienteMostradorQuery } from "../../api/comisionesApi";
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
    rif: "",
    referencia: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [mensajeCargaAnterior, setMensajeCargaAnterior] = useState<string | null>(null);

  const [getUltimoPaciente, { isFetching: loadingUltimoPaciente }] =
    useLazyGetUltimoPacienteMostradorQuery();

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

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      rif: calculateRIF(prev.tipo_cedula, prev.cedula),
    }));
  }, [form.tipo_cedula, form.cedula]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const nextValue = name === "monto" ? sanitizeMonto(value) : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
    setError("");
    setMensajeCargaAnterior(null);
    if (name in fieldErrors) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const cedulaCompleta = `${form.tipo_cedula}${form.cedula}`.trim();
  const puedeCargarAnterior = form.cedula.trim().length >= 6 && validarRangoCedula(form.cedula);

  const handleCargarDatosAnteriores = async () => {
    if (!puedeCargarAnterior) return;
    setMensajeCargaAnterior(null);
    try {
      const result = await getUltimoPaciente(cedulaCompleta).unwrap();
      if (result) {
        setForm((prev) => ({
          ...prev,
          nombre: result.nombre || prev.nombre,
          apellido: result.apellido || prev.apellido,
          rif: result.rif ?? prev.rif,
        }));
        setFieldErrors((prev) => ({ ...prev, nombre: "", apellido: "" }));
        setMensajeCargaAnterior("Datos de una cita anterior cargados. Puedes editarlos y registrar la nueva cita.");
      } else {
        setMensajeCargaAnterior("No se encontró ninguna cita de mostrador previa con esta cédula.");
      }
    } catch {
      setMensajeCargaAnterior("No se pudo cargar; intenta de nuevo.");
    }
  };

  const validateForm = (): boolean => {
    const err: Record<string, string> = {};
    if (!form.id_especialista?.trim()) err.id_especialista = "Selecciona un especialista.";
    if (!form.id_eco?.trim()) err.id_eco = "Selecciona un eco.";
    if (!form.fecha_cita?.trim()) err.fecha_cita = "La fecha es obligatoria.";
    else {
      const f = new Date(form.fecha_cita);
      if (Number.isNaN(f.getTime())) err.fecha_cita = "Fecha inválida.";
    }
    if (!form.nombre?.trim()) err.nombre = "El nombre es obligatorio.";
    else if (form.nombre.trim().length > 36) err.nombre = "Máximo 36 caracteres.";
    if (!form.apellido?.trim()) err.apellido = "El apellido es obligatorio.";
    else if (form.apellido.trim().length > 36) err.apellido = "Máximo 36 caracteres.";
    if (!form.cedula?.trim()) err.cedula = "La cédula es obligatoria.";
    else if (!/^\d+$/.test(form.cedula.trim())) err.cedula = "Solo números.";
    else if (!validarRangoCedula(form.cedula)) err.cedula = MENSAJE_RANGO_CEDULA;
    const errMonto = validarMonto(form.monto);
    if (errMonto) err.monto = errMonto;
    if (isMetodoEnBs) {
      const tasa = Number(form.tasa_dia_bcv);
      if (!form.tasa_dia_bcv?.trim()) err.tasa_dia_bcv = "La tasa BCV es obligatoria para este método.";
      else if (!Number.isFinite(tasa) || tasa <= 0) err.tasa_dia_bcv = "La tasa BCV debe ser mayor a 0.";
    }
    if (form.referencia.trim().length > 80) err.referencia = "Máximo 80 caracteres.";
    setFieldErrors(err);
    if (Object.keys(err).length > 0) {
      setError(Object.values(err)[0]);
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const monto = Number(form.monto);
    const tasa = Number(form.tasa_dia_bcv);
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
      rif: form.rif.trim() || undefined,
      referencia: form.referencia.trim() || undefined,
    });
  };

  const inputError = "border-red-500 focus:border-red-500 focus:ring-red-500/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-lg">
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6">
          <h2 className="text-lg font-semibold text-gray-900">Registrar cita de mostrador</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" type="button">
            <X size={20} />
          </button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 min-w-0 md:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-gray-700">Especialista *</label>
              <select
                name="id_especialista"
                value={form.id_especialista}
                onChange={handleChange}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-sm ${fieldErrors.id_especialista ? inputError : "border-gray-300"}`}
                required
              >
                <option value="">Selecciona especialista</option>
                {especialistas.map((esp) => (
                  <option key={esp.id_especialista} value={esp.id_especialista}>
                    {esp.nombre} {esp.apellido}
                  </option>
                ))}
              </select>
              {fieldErrors.id_especialista && <p className="mt-1 text-xs text-red-500">{fieldErrors.id_especialista}</p>}
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-gray-700">Eco *</label>
              <select
                name="id_eco"
                value={form.id_eco}
                onChange={handleChange}
                disabled={!form.id_especialista || loadingEcos}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-sm disabled:opacity-50 ${fieldErrors.id_eco ? inputError : "border-gray-300"}`}
                required
              >
                <option value="">{loadingEcos ? "Cargando..." : "Selecciona eco"}</option>
                {ecos.map((eco) => (
                  <option key={eco.id_eco} value={eco.id_eco}>
                    {eco.nombre}
                  </option>
                ))}
              </select>
              {fieldErrors.id_eco && <p className="mt-1 text-xs text-red-500">{fieldErrors.id_eco}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 min-w-0 md:grid-cols-3">
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-gray-700">Fecha *</label>
              <input
                type="date"
                name="fecha_cita"
                value={form.fecha_cita}
                onChange={handleChange}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-sm ${fieldErrors.fecha_cita ? inputError : "border-gray-300"}`}
                required
              />
              {fieldErrors.fecha_cita && <p className="mt-1 text-xs text-red-500">{fieldErrors.fecha_cita}</p>}
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-gray-700">Método de pago *</label>
              <select
                name="metodo"
                value={form.metodo}
                onChange={handleChange}
                className="h-10 w-full min-w-0 rounded-md border border-gray-300 px-3 text-sm"
                required
              >
                {METODOS.map((metodo) => (
                  <option key={metodo} value={metodo}>
                    {metodo}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Monto ({isMetodoEnBs ? "Bs" : "$"}) *
              </label>
              <input
                type="number"
                name="monto"
                value={form.monto}
                onChange={handleChange}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-sm ${fieldErrors.monto ? inputError : "border-gray-300"}`}
                min="0"
                step="0.01"
                required
              />
              {fieldErrors.monto && <p className="mt-1 text-xs text-red-500">{fieldErrors.monto}</p>}
              <p className="mt-1 text-xs text-gray-500">
                Calculado automáticamente según eco y método de pago. Puedes editarlo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 min-w-0 md:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-gray-700">Tasa BCV del día *</label>
              <input
                type="number"
                name="tasa_dia_bcv"
                value={form.tasa_dia_bcv}
                onChange={handleChange}
                disabled={!isMetodoEnBs}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-sm disabled:opacity-50 ${fieldErrors.tasa_dia_bcv ? inputError : "border-gray-300"}`}
                min="0"
                step="0.0001"
                required={isMetodoEnBs}
              />
              {fieldErrors.tasa_dia_bcv && <p className="mt-1 text-xs text-red-500">{fieldErrors.tasa_dia_bcv}</p>}
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
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-gray-700">Referencia (opcional)</label>
              <input
                type="text"
                name="referencia"
                value={form.referencia}
                onChange={handleChange}
                maxLength={80}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-sm ${fieldErrors.referencia ? inputError : "border-gray-300"}`}
                placeholder="Se genera automática si la dejas vacía"
              />
              {fieldErrors.referencia && <p className="mt-1 text-xs text-red-500">{fieldErrors.referencia}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 min-w-0 md:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                maxLength={36}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-sm ${fieldErrors.nombre ? inputError : "border-gray-300"}`}
                required
              />
              {fieldErrors.nombre && <p className="mt-1 text-xs text-red-500">{fieldErrors.nombre}</p>}
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-gray-700">Apellido *</label>
              <input
                type="text"
                name="apellido"
                value={form.apellido}
                onChange={handleChange}
                maxLength={36}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-sm ${fieldErrors.apellido ? inputError : "border-gray-300"}`}
                required
              />
              {fieldErrors.apellido && <p className="mt-1 text-xs text-red-500">{fieldErrors.apellido}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 min-w-0 md:grid-cols-2">
            <div className="min-w-0">
              <CedulaField
                label="Cédula *"
                value={`${form.tipo_cedula}${form.cedula}`}
                onChange={(tipo, numero) => {
                  setForm((prev) => ({ ...prev, tipo_cedula: tipo, cedula: numero }));
                  setMensajeCargaAnterior(null);
                  if (fieldErrors.cedula) setFieldErrors((prev) => ({ ...prev, cedula: "" }));
                }}
                error={fieldErrors.cedula}
                required
                inputClassName={`h-10 rounded-md text-sm ${fieldErrors.cedula ? "border-red-500" : "border-gray-300"}`}
                selectClassName="h-10 rounded-md border-gray-300 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Con la cédula puedes cargar nombre, apellido y RIF de una cita de mostrador anterior.
              </p>
              {puedeCargarAnterior && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleCargarDatosAnteriores}
                    disabled={loadingUltimoPaciente}
                    className="text-sm text-teal-600 hover:text-teal-800 hover:underline disabled:opacity-50"
                  >
                    {loadingUltimoPaciente ? "Buscando…" : "Cargar datos de cita anterior"}
                  </button>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-gray-700">RIF</label>
              <input
                type="text"
                name="rif"
                value={form.rif}
                onChange={handleChange}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-sm ${fieldErrors.rif ? inputError : "border-gray-300"}`}
                placeholder="Se calcula desde la cédula; puedes editarlo"
                aria-describedby="rif-desc"
              />
              {fieldErrors.rif && <p className="mt-1 text-xs text-red-500">{fieldErrors.rif}</p>}
              <p id="rif-desc" className="mt-1 text-xs text-gray-500">
                Se rellena automáticamente según la cédula. Puedes modificarlo si es necesario.
              </p>
            </div>
          </div>
          {mensajeCargaAnterior && (
            <p className="text-sm text-gray-600 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
              {mensajeCargaAnterior}
            </p>
          )}
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
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
