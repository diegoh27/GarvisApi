import { useMemo } from "react";
import { X } from "lucide-react";
import { CedulaField } from "../../../../shared";
import type { EspecialistaInventario } from "../../api/especialistasApi";
import { useCitaMostradorForm } from "../../hooks/useCitaMostradorForm";

type Props = {
  especialistas: EspecialistaInventario[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: {
    id_especialista: string;
    id_eco: string;
    fecha_cita: string;
    hora_cita: string;
    metodo: "Efectivo" | "Transferencia" | "PagoMovil" | "Zelle" | "Otro";
    monto: number;
    tasa_dia_bcv: number;
    nombre: string;
    apellido: string;
    cedula: string;
    rif?: string;
    referencia?: string;
    id_paciente?: string;
    id_representado?: string;
  }) => Promise<void>;
};

export default function RegistrarCitaMostradorModal({
  especialistas,
  isSaving,
  onClose,
  onSave,
}: Props) {
  const {
    form,
    fieldErrors,
    error,
    mensajeCargaAnterior,
    vincularRepresentado,
    vincularCitaAlTitular,
    setVincularCitaAlTitular,
    searchRepNombre,
    setSearchRepNombre,
    searchRepApellido,
    setSearchRepApellido,
    resultadosRep,
    loadingBuscarRep,
    loadingCrearRep,
    showCrearRepresentadoForm,
    setShowCrearRepresentadoForm,
    repForm,
    setRepForm,
    repFormErrors,
    setRepFormErrors,
    titularYaRegistrado,
    setTitularYaRegistrado,
    loadingDatosPorCedula,
    dolarOficial,
    loadingDolar,
    ecos,
    loadingEcos,
    loadingOcupacion,
    horaOcupada,
    isMetodoEnBs,
    monedaRegistro,
    setMonedaRegistro,
    setMontoRegistroDesdeBs,
    handleChange,
    handleBuscarRepresentadoPorNombre,
    handleSeleccionarRepresentado,
    handleAbrirCrearRepresentado,
    handleVerificarTitular,
    handleCrearRepresentadoSubmit,
    handleCargarDatosAnteriores,
    validateRepForm,
    handleSubmit,
    puedeCargarAnterior,
    HORA_OPTIONS,
    METODOS_API,
    inputError,
  } = useCitaMostradorForm({ onSave });

  const tasaNum = useMemo(() => {
    const t = Number(form.tasa_dia_bcv);
    if (Number.isFinite(t) && t > 0) return t;
    const p = Number(dolarOficial?.promedio);
    return Number.isFinite(p) && p > 0 ? p : 0;
  }, [form.tasa_dia_bcv, dolarOficial?.promedio]);

  const montoNum = Number(form.monto);
  const montoBsEquivalenteStr =
    !isMetodoEnBs && tasaNum > 0 && Number.isFinite(montoNum) && String(form.monto).trim() !== ""
      ? (montoNum * tasaNum).toFixed(2)
      : "";

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
              <label className="mb-1 block text-base font-medium text-gray-700">Especialista *</label>
              <select
                name="id_especialista"
                value={form.id_especialista}
                onChange={handleChange}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-base ${fieldErrors.id_especialista ? inputError : "border-gray-300"}`}
                required
              >
                <option value="">Selecciona especialista</option>
                {especialistas.map((esp) => (
                  <option key={esp.id_especialista} value={esp.id_especialista}>
                    {esp.nombre} {esp.apellido}
                  </option>
                ))}
              </select>
              {fieldErrors.id_especialista && <p className="mt-1 text-base text-red-500">{fieldErrors.id_especialista}</p>}
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-base font-medium text-gray-700">Eco *</label>
              <select
                name="id_eco"
                value={form.id_eco}
                onChange={handleChange}
                disabled={!form.id_especialista || loadingEcos}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-base disabled:opacity-50 ${fieldErrors.id_eco ? inputError : "border-gray-300"}`}
                required
              >
                <option value="">{loadingEcos ? "Cargando..." : "Selecciona eco"}</option>
                {ecos.map((eco) => (
                  <option key={eco.id_eco} value={eco.id_eco}>
                    {eco.nombre}
                  </option>
                ))}
              </select>
              {fieldErrors.id_eco && <p className="mt-1 text-base text-red-500">{fieldErrors.id_eco}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 min-w-0 md:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-1 block text-base font-medium text-gray-700">Fecha *</label>
              <input
                type="date"
                name="fecha_cita"
                value={form.fecha_cita}
                onChange={handleChange}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-base ${fieldErrors.fecha_cita ? inputError : "border-gray-300"}`}
                required
              />
              {fieldErrors.fecha_cita && <p className="mt-1 text-base text-red-500">{fieldErrors.fecha_cita}</p>}
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-base font-medium text-gray-700">Hora * (bloques 20 min)</label>
              <select
                name="hora_cita"
                value={form.hora_cita}
                onChange={handleChange}
                disabled={!form.id_especialista || !form.fecha_cita}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-base disabled:opacity-50 ${fieldErrors.hora_cita ? inputError : "border-gray-300"}`}
                required
              >
                <option value="">{loadingOcupacion ? "Cargando..." : "Selecciona hora"}</option>
                {HORA_OPTIONS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={horaOcupada(opt.value)}
                  >
                    {opt.value === form.hora_cita && horaOcupada(opt.value)
                      ? `${opt.label} (ocupado)`
                      : horaOcupada(opt.value)
                        ? `${opt.label} — ocupado`
                        : opt.label}
                  </option>
                ))}
              </select>
              {fieldErrors.hora_cita && <p className="mt-1 text-base text-red-500">{fieldErrors.hora_cita}</p>}
              <p className="mt-1 text-base text-gray-500">
                Horarios que chocan con otra cita del especialista aparecen como ocupados.
              </p>
            </div>
          </div>

          {!isMetodoEnBs && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-slate-50 px-3 py-2">
              <span className="text-base font-medium text-gray-600">Monto en</span>
              <button
                type="button"
                onClick={() => setMonedaRegistro("usd")}
                className={`rounded-md px-3 py-1 text-base font-semibold ${
                  monedaRegistro === "usd" ? "bg-teal-700 text-white" : "bg-white text-gray-700 ring-1 ring-gray-200"
                }`}
              >
                USD
              </button>
              <button
                type="button"
                onClick={() => setMonedaRegistro("bs")}
                className={`rounded-md px-3 py-1 text-base font-semibold ${
                  monedaRegistro === "bs" ? "bg-teal-700 text-white" : "bg-white text-gray-700 ring-1 ring-gray-200"
                }`}
              >
                Bs
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 min-w-0 md:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-1 block text-base font-medium text-gray-700">Método de pago *</label>
              <select
                name="metodo"
                value={form.metodo}
                onChange={handleChange}
                className="h-10 w-full min-w-0 rounded-md border border-gray-300 px-3 text-base"
                required
              >
                {METODOS_API.map((metodo) => (
                  <option key={metodo} value={metodo}>
                    {metodo}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-base font-medium text-gray-700">
                {isMetodoEnBs ? "Monto (Bs) *" : monedaRegistro === "bs" ? "Monto (Bs) *" : "Monto (USD) *"}
              </label>
              {isMetodoEnBs && (
                <input
                  type="number"
                  name="monto"
                  value={form.monto}
                  onChange={handleChange}
                  className={`h-10 w-full min-w-0 rounded-md border px-3 text-base ${fieldErrors.monto ? inputError : "border-gray-300"}`}
                  min="0"
                  step="0.01"
                  required
                />
              )}
              {!isMetodoEnBs && monedaRegistro === "usd" && (
                <input
                  type="number"
                  name="monto"
                  value={form.monto}
                  onChange={handleChange}
                  className={`h-10 w-full min-w-0 rounded-md border px-3 text-base ${fieldErrors.monto ? inputError : "border-gray-300"}`}
                  min="0"
                  step="0.01"
                  required
                />
              )}
              {!isMetodoEnBs && monedaRegistro === "bs" && (
                <input
                  type="number"
                  value={form.monto.trim() === "" ? "" : montoBsEquivalenteStr}
                  onChange={(e) => setMontoRegistroDesdeBs(e.target.value)}
                  className={`h-10 w-full min-w-0 rounded-md border px-3 text-base ${fieldErrors.monto ? inputError : "border-gray-300"}`}
                  min="0"
                  step="0.01"
                  disabled={tasaNum <= 0}
                  placeholder={tasaNum <= 0 ? "Tasa BCV requerida" : ""}
                  required
                />
              )}
              {fieldErrors.monto && <p className="mt-1 text-base text-red-500">{fieldErrors.monto}</p>}
              <p className="mt-1 text-base text-gray-500">
                Calculado automáticamente según eco y método de pago. Puedes editarlo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 min-w-0 md:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-1 block text-base font-medium text-gray-700">Tasa BCV del día *</label>
              <input
                type="number"
                name="tasa_dia_bcv"
                value={form.tasa_dia_bcv}
                onChange={handleChange}
                disabled={!isMetodoEnBs}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-base disabled:opacity-50 ${fieldErrors.tasa_dia_bcv ? inputError : "border-gray-300"}`}
                min="0"
                step="0.0001"
                required={isMetodoEnBs}
              />
              {fieldErrors.tasa_dia_bcv && <p className="mt-1 text-base text-red-500">{fieldErrors.tasa_dia_bcv}</p>}
              <p className="mt-1 text-base text-gray-500">
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
              <label className="mb-1 block text-base font-medium text-gray-700">Referencia (opcional)</label>
              <input
                type="text"
                name="referencia"
                value={form.referencia}
                onChange={handleChange}
                maxLength={80}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-base ${fieldErrors.referencia ? inputError : "border-gray-300"}`}
                placeholder="Se genera automática si la dejas vacía"
              />
              {fieldErrors.referencia && <p className="mt-1 text-base text-red-500">{fieldErrors.referencia}</p>}
            </div>
          </div>

          <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-4 space-y-3">
            <p className="text-base font-medium text-teal-900">¿La cita es para un representado que aún no está registrado?</p>
            <p className="text-base text-teal-800">
              Crea el representado y asígnalo al titular por cédula. Si el titular ya está registrado, solo llena la cédula. Si no está en el sistema, indica nombre y apellido del titular para esta cita (no se crea usuario; cuando el titular se registre con su cédula podrá reclamar sus citas y representados).
            </p>
            {!showCrearRepresentadoForm ? (
              <button
                type="button"
                onClick={handleAbrirCrearRepresentado}
                className="text-base text-teal-600 hover:text-teal-800 hover:underline font-medium"
              >
                Crear representado nuevo y asignarlo al titular
              </button>
            ) : (
              <div className="space-y-3" role="group" aria-label="Formulario crear representado">
                {repFormErrors._form && (
                  <p className="text-base text-red-600">{repFormErrors._form}</p>
                )}
                <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2">
                  <div className="min-w-0 sm:col-span-2 space-y-2">
                    <div className="min-w-0">
                      <CedulaField
                        label="Cédula del titular (paciente) *"
                        value={repForm.cedula_titular}
                        onChange={(tipo, numero) => {
                          setRepForm((p) => ({ ...p, cedula_titular: `${tipo}${numero}` }));
                          setTitularYaRegistrado(null);
                        }}
                        error={repFormErrors.cedula_titular}
                        required
                        placeholder="Número de cédula"
                        inputClassName={`h-9 rounded border px-2 text-base ${repFormErrors.cedula_titular ? "border-red-500" : "border-teal-300"}`}
                        selectClassName="h-9 rounded border-teal-300 text-base"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleVerificarTitular}
                          disabled={loadingDatosPorCedula || repForm.cedula_titular.replace(/\D/g, "").length < 6}
                          className="text-base text-teal-600 hover:text-teal-800 hover:underline disabled:opacity-50"
                        >
                          {loadingDatosPorCedula ? "Verificando…" : "Verificar si el titular ya está registrado"}
                        </button>
                      </div>
                    </div>
                    {titularYaRegistrado && (
                      <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-base text-green-800">
                        <strong>Titular ya registrado:</strong> {titularYaRegistrado.nombre} {titularYaRegistrado.apellido} (cédula {repForm.cedula_titular}). Solo completa los datos del representado debajo.
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 sm:col-span-2 space-y-2">
                    <p className="text-base font-semibold text-teal-900 border-b border-teal-200 pb-1">Datos del titular</p>
                    <p className="text-base font-medium text-teal-800">Si el titular no está registrado, indica nombre y apellido para esta cita (no se crea cuenta; al registrarse con su cédula podrá reclamar citas y representados):</p>
                    <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2">
                      <div className="min-w-0">
                        <label className="mb-0.5 block text-base text-teal-900">Nombre del titular *</label>
                        <input
                          type="text"
                          value={repForm.nombre_titular}
                          onChange={(e) => setRepForm((p) => ({ ...p, nombre_titular: e.target.value }))}
                          placeholder="Nombre del titular"
                          className={`h-9 w-full rounded border px-2 text-base ${repFormErrors.nombre_titular ? "border-red-500" : "border-teal-300"}`}
                        />
                        {repFormErrors.nombre_titular && <p className="text-base text-red-500">{repFormErrors.nombre_titular}</p>}
                      </div>
                      <div className="min-w-0">
                        <label className="mb-0.5 block text-base text-teal-900">Apellido del titular *</label>
                        <input
                          type="text"
                          value={repForm.apellido_titular}
                          onChange={(e) => setRepForm((p) => ({ ...p, apellido_titular: e.target.value }))}
                          placeholder="Apellido del titular"
                          className={`h-9 w-full rounded border px-2 text-base ${repFormErrors.apellido_titular ? "border-red-500" : "border-teal-300"}`}
                        />
                        {repFormErrors.apellido_titular && <p className="text-base text-red-500">{repFormErrors.apellido_titular}</p>}
                      </div>
                      <div className="min-w-0">
                        <label className="mb-0.5 block text-base text-teal-900">Género del titular *</label>
                        <select
                          value={repForm.genero_titular}
                          onChange={(e) => setRepForm((p) => ({ ...p, genero_titular: e.target.value as typeof repForm.genero_titular }))}
                          className={`h-9 w-full rounded border px-2 text-base ${repFormErrors.genero_titular ? "border-red-500" : "border-teal-300"}`}
                        >
                          <option value="">Selecciona</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Femenino">Femenino</option>
                        </select>
                        {repFormErrors.genero_titular && <p className="text-base text-red-500">{repFormErrors.genero_titular}</p>}
                      </div>
                      <div className="min-w-0">
                        <label className="mb-0.5 block text-base text-teal-900">Fecha nac. titular *</label>
                        <input
                          type="date"
                          value={repForm.fecha_nacimiento_titular}
                          onChange={(e) => setRepForm((p) => ({ ...p, fecha_nacimiento_titular: e.target.value }))}
                          className={`h-9 w-full rounded border px-2 text-base ${repFormErrors.fecha_nacimiento_titular ? "border-red-500" : "border-teal-300"}`}
                        />
                        {repFormErrors.fecha_nacimiento_titular && <p className="text-base text-red-500">{repFormErrors.fecha_nacimiento_titular}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 sm:col-span-2 space-y-2">
                    <p className="text-base font-semibold text-teal-900 border-b border-teal-200 pb-1">Datos del representado</p>
                    <div className="min-w-0 flex gap-1">
                    <div className="flex-1">
                      <label className="mb-1 block text-base font-medium text-teal-900">Nombre representado *</label>
                      <input
                        type="text"
                        value={repForm.nombre}
                        onChange={(e) => setRepForm((p) => ({ ...p, nombre: e.target.value }))}
                        className={`h-9 w-full rounded border px-2 text-base ${repFormErrors.nombre ? "border-red-500" : "border-teal-300"}`}
                      />
                      {repFormErrors.nombre && <p className="text-base text-red-500">{repFormErrors.nombre}</p>}
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-base font-medium text-teal-900">Apellido *</label>
                      <input
                        type="text"
                        value={repForm.apellido}
                        onChange={(e) => setRepForm((p) => ({ ...p, apellido: e.target.value }))}
                        className={`h-9 w-full rounded border px-2 text-base ${repFormErrors.apellido ? "border-red-500" : "border-teal-300"}`}
                      />
                      {repFormErrors.apellido && <p className="text-base text-red-500">{repFormErrors.apellido}</p>}
                    </div>
                  </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="mb-1 block text-base font-medium text-teal-900">Fecha nacimiento *</label>
                    <input
                      type="date"
                      value={repForm.fecha_nacimiento}
                      onChange={(e) => setRepForm((p) => ({ ...p, fecha_nacimiento: e.target.value }))}
                      className={`h-9 w-full rounded border px-2 text-base ${repFormErrors.fecha_nacimiento ? "border-red-500" : "border-teal-300"}`}
                    />
                    {repFormErrors.fecha_nacimiento && <p className="text-base text-red-500">{repFormErrors.fecha_nacimiento}</p>}
                  </div>
                  <div className="min-w-0">
                    <label className="mb-1 block text-base font-medium text-teal-900">Género *</label>
                    <select
                      value={repForm.genero}
                      onChange={(e) => setRepForm((p) => ({ ...p, genero: e.target.value as typeof repForm.genero }))}
                      className={`h-9 w-full rounded border px-2 text-base ${repFormErrors.genero ? "border-red-500" : "border-teal-300"}`}
                    >
                      <option value="">Selecciona</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </select>
                    {repFormErrors.genero && <p className="text-base text-red-500">{repFormErrors.genero}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="mb-1 block text-base font-medium text-teal-900">Parentesco (opcional)</label>
                    <input
                      type="text"
                      value={repForm.parentesco}
                      onChange={(e) => setRepForm((p) => ({ ...p, parentesco: e.target.value }))}
                      placeholder="Ej. Hijo/a"
                      className="h-9 w-full rounded border border-teal-300 px-2 text-base"
                    />
                  </div>
                  <div className="min-w-0">
                    <CedulaField
                      label="Cédula del representado (opcional)"
                      value={`${repForm.tipo_cedula_rep}${repForm.cedula_rep}`}
                      onChange={(tipo, numero) => setRepForm((p) => ({ ...p, tipo_cedula_rep: tipo, cedula_rep: numero }))}
                      error={repFormErrors.cedula_rep}
                      required={false}
                      placeholder="Número de cédula"
                      inputClassName={`h-9 rounded border px-2 text-base ${repFormErrors.cedula_rep ? "border-red-500" : "border-teal-300"}`}
                      selectClassName="h-9 rounded border-teal-300 text-base"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={loadingCrearRep}
                    onClick={(e) => {
                      e.preventDefault();
                      if (validateRepForm() && !loadingCrearRep) handleCrearRepresentadoSubmit(e as unknown as React.FormEvent);
                    }}
                    className="h-9 rounded bg-teal-600 px-3 text-base font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {loadingCrearRep ? "Creando…" : "Crear representado y usar en esta cita"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCrearRepresentadoForm(false); setRepFormErrors({}); }}
                    className="h-9 rounded border border-teal-300 px-3 text-base text-teal-700 hover:bg-teal-100"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
            <p className="text-base font-medium text-amber-900">Si es un menor sin cédula</p>
            <p className="text-base text-amber-800">
              Busca el representado por nombre o apellido; se usará la cédula del titular para el pago y la cita quedará en su cuenta.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1">
                <label className="sr-only">Nombre del representado</label>
                <input
                  type="text"
                  placeholder="Nombre"
                  value={searchRepNombre}
                  onChange={(e) => setSearchRepNombre(e.target.value)}
                  className="h-10 w-full rounded-md border border-amber-300 bg-white px-3 text-base"
                />
              </div>
              <div className="min-w-0 flex-1">
                <label className="sr-only">Apellido del representado</label>
                <input
                  type="text"
                  placeholder="Apellido"
                  value={searchRepApellido}
                  onChange={(e) => setSearchRepApellido(e.target.value)}
                  className="h-10 w-full rounded-md border border-amber-300 bg-white px-3 text-base"
                />
              </div>
              <button
                type="button"
                onClick={handleBuscarRepresentadoPorNombre}
                disabled={loadingBuscarRep || (!searchRepNombre.trim() && !searchRepApellido.trim())}
                className="h-10 rounded-md bg-amber-600 px-3 text-base font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {loadingBuscarRep ? "Buscando…" : "Buscar representado"}
              </button>
            </div>
            {resultadosRep.length > 0 && (
              <div className="space-y-1">
                <p className="text-base font-medium text-amber-900">Selecciona el representado:</p>
                <ul className="max-h-40 overflow-y-auto rounded-md border border-amber-200 bg-white">
                  {resultadosRep.map((rep) => (
                    <li key={rep.id_representado}>
                      <button
                        type="button"
                        onClick={() => handleSeleccionarRepresentado(rep)}
                        className="w-full px-3 py-2 text-left text-base hover:bg-amber-100"
                      >
                        {rep.nombre} {rep.apellido}
                        <span className="ml-2 text-amber-700">(titular: {rep.titular_nombre} {rep.titular_apellido})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 min-w-0 md:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-1 block text-base font-medium text-gray-700">Nombre *</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                maxLength={36}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-base ${fieldErrors.nombre ? inputError : "border-gray-300"}`}
                required
              />
              {fieldErrors.nombre && <p className="mt-1 text-base text-red-500">{fieldErrors.nombre}</p>}
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-base font-medium text-gray-700">Apellido *</label>
              <input
                type="text"
                name="apellido"
                value={form.apellido}
                onChange={handleChange}
                maxLength={36}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-base ${fieldErrors.apellido ? inputError : "border-gray-300"}`}
                required
              />
              {fieldErrors.apellido && <p className="mt-1 text-base text-red-500">{fieldErrors.apellido}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 min-w-0 md:grid-cols-2">
            <div className="min-w-0">
              <CedulaField
                label={vincularRepresentado ? "Cédula (del titular para el pago; opcional)" : "Cédula *"}
                value={`${form.tipo_cedula}${form.cedula}`}
                onChange={(tipo, numero) => {
                  setForm((prev) => ({ ...prev, tipo_cedula: tipo, cedula: numero }));
                  setMensajeCargaAnterior(null);
                  if (fieldErrors.cedula) setFieldErrors((prev) => ({ ...prev, cedula: "" }));
                }}
                error={fieldErrors.cedula}
                required={!vincularRepresentado}
                inputClassName={`h-10 rounded-md text-base ${fieldErrors.cedula ? "border-red-500" : "border-gray-300"}`}
                selectClassName="h-10 rounded-md border-gray-300 text-base"
              />
              <p className="mt-1 text-base text-gray-500">
                Con la cédula puedes cargar nombre, apellido y RIF: se buscan pacientes registrados, representados y citas de mostrador anteriores.
              </p>
              {puedeCargarAnterior && (
                <div className="mt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleCargarDatosAnteriores}
                    disabled={loadingDatosPorCedula}
                    className="text-base text-teal-600 hover:text-teal-800 hover:underline disabled:opacity-50"
                  >
                    {loadingDatosPorCedula ? "Buscando…" : "Cargar datos por cédula"}
                  </button>
                  {vincularRepresentado && (
                    <label className="mt-2 flex items-start gap-2 text-base text-gray-700">
                      <input
                        type="checkbox"
                        checked={vincularCitaAlTitular}
                        onChange={(e) => setVincularCitaAlTitular(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span>Vincular esta cita al titular (aparecerá en Mis citas del representado)</span>
                    </label>
                  )}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-base font-medium text-gray-700">RIF</label>
              <input
                type="text"
                name="rif"
                value={form.rif}
                onChange={handleChange}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-base ${fieldErrors.rif ? inputError : "border-gray-300"}`}
                placeholder="Se calcula desde la cédula; puedes editarlo"
                aria-describedby="rif-desc"
              />
              {fieldErrors.rif && <p className="mt-1 text-base text-red-500">{fieldErrors.rif}</p>}
              <p id="rif-desc" className="mt-1 text-base text-gray-500">
                Se rellena automáticamente según la cédula. Puedes modificarlo si es necesario.
              </p>
            </div>
          </div>
          {mensajeCargaAnterior && (
            <p className="text-base text-gray-600 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
              {mensajeCargaAnterior}
            </p>
          )}
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-base text-red-700">{error}</div>
          )}

          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-base text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-teal-600 px-4 py-2 text-base text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : "Registrar cita"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
