import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useGetEcosByEspecialistaQuery } from "../../../ecos/ecosApi";
import { useGetDolarOficialQuery } from "../../../dolar/dolarApi";
import { useLazyGetDatosPorCedulaQuery, useLazyBuscarRepresentadoPorNombreQuery, useGetOcupacionEspecialistaQuery, useCrearRepresentadoPorCedulaTitularMutation } from "../../api/comisionesApi";
import { calculateRIF, formatNombreApellido, validarRangoCedula, MENSAJE_RANGO_CEDULA, CedulaField, toDateKey } from "../../../../shared";
import type { EspecialistaInventario } from "../../api/especialistasApi";
import { sanitizeMonto, validarMonto } from "../../utils/validation";

/** Opciones de hora cada 20 min (como en calendario del especialista): 06:00 a 19:40 */
const HORA_OPTIONS: { value: string; label: string }[] = (() => {
  const opts: { value: string; label: string }[] = [];
  for (let h = 6; h < 20; h++) {
    for (let m = 0; m < 60; m += 20) {
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
      const period = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      opts.push({ value, label: `${h12}:${String(m).padStart(2, "0")} ${period}` });
    }
  }
  return opts;
})();

/** Convierte "HH:MM:00" a minutos desde medianoche */
function horaToMinutes(h: string): number {
  const parts = String(h).trim().split(":");
  const hour = parseInt(parts[0] || "0", 10);
  const min = parseInt(parts[1] || "0", 10);
  return hour * 60 + min;
}

/** Dos bloques de 20 min [a, a+20) y [b, b+20) se solapan */
function slotsOverlap(a: string, b: string): boolean {
  const aMin = horaToMinutes(a);
  const bMin = horaToMinutes(b);
  return aMin < bMin + 20 && aMin + 20 > bMin;
}

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
  const [form, setForm] = useState({
    id_especialista: "",
    id_eco: "",
    fecha_cita: toDateKey(new Date()),
    hora_cita: "08:00:00",
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
  /** Si la cédula cargó un representado, guardamos sus ids para ofrecer vincular la cita al titular */
  const [vincularRepresentado, setVincularRepresentado] = useState<{ id_paciente: string; id_representado: string } | null>(null);
  const [vincularCitaAlTitular, setVincularCitaAlTitular] = useState(false);
  /** Búsqueda por nombre (menor sin cédula) */
  const [searchRepNombre, setSearchRepNombre] = useState("");
  const [searchRepApellido, setSearchRepApellido] = useState("");
  const [resultadosRep, setResultadosRep] = useState<Array<{
    id_representado: string;
    id_paciente: string;
    nombre: string;
    apellido: string;
    titular_cedula: string;
    titular_nombre: string;
    titular_apellido: string;
  }>>([]);
  const [buscarRep, { isFetching: loadingBuscarRep }] = useLazyBuscarRepresentadoPorNombreQuery();
  const [crearRepresentado, { isLoading: loadingCrearRep }] = useCrearRepresentadoPorCedulaTitularMutation();

  /** Formulario para crear representado nuevo (asignado al titular por cédula) */
  const [showCrearRepresentadoForm, setShowCrearRepresentadoForm] = useState(false);
  const [repForm, setRepForm] = useState({
    cedula_titular: "",
    nombre_titular: "",
    apellido_titular: "",
    genero_titular: "" as "" | "Masculino" | "Femenino",
    fecha_nacimiento_titular: "",
    nombre: "",
    apellido: "",
    fecha_nacimiento: "",
    genero: "" as "" | "Masculino" | "Femenino",
    parentesco: "",
    tipo_cedula_rep: "V" as const,
    cedula_rep: "",
  });
  const [repFormErrors, setRepFormErrors] = useState<Record<string, string>>({});
  /** Si al verificar la cédula del titular encontramos un paciente ya registrado */
  const [titularYaRegistrado, setTitularYaRegistrado] = useState<{ nombre: string; apellido: string } | null>(null);

  const [getDatosPorCedula, { isFetching: loadingDatosPorCedula }] =
    useLazyGetDatosPorCedulaQuery();

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

  const { data: ocupacionData, isLoading: loadingOcupacion } = useGetOcupacionEspecialistaQuery(
    { id_especialista: form.id_especialista, fecha: form.fecha_cita },
    { skip: !form.id_especialista || !form.fecha_cita },
  );
  const ocupados = ocupacionData?.ocupados ?? [];

  const horaOcupada = useMemo(() => (slot: string) => {
    return ocupados.some((o) => slotsOverlap(o, slot));
  }, [ocupados]);

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
    if (name === "cedula" || name === "tipo_cedula") setVincularRepresentado(null);
  };

  const cedulaCompleta = `${form.tipo_cedula}${form.cedula}`.trim();
  const puedeCargarAnterior = form.cedula.trim().length >= 6 && validarRangoCedula(form.cedula);

  const parseTitularCedula = (titularCedula: string) => {
    const s = String(titularCedula || "").trim();
    if (/^[VE]\d+/i.test(s)) return { tipo: s[0].toUpperCase() as "V" | "E", numero: s.slice(1).replace(/\D/g, "") };
    return { tipo: "V" as const, numero: s.replace(/\D/g, "") };
  };

  const handleBuscarRepresentadoPorNombre = async () => {
    const nom = searchRepNombre.trim();
    const ape = searchRepApellido.trim();
    if (!nom && !ape) return;
    setResultadosRep([]);
    try {
      const list = await buscarRep({ nombre: nom || undefined, apellido: ape || undefined }).unwrap();
      setResultadosRep(list);
      if (list.length === 0) setMensajeCargaAnterior("No se encontró ningún representado con ese nombre o apellido.");
      else setMensajeCargaAnterior(null);
    } catch {
      setMensajeCargaAnterior("No se pudo buscar; intenta de nuevo.");
    }
  };

  const handleSeleccionarRepresentado = (rep: typeof resultadosRep[0]) => {
    const { tipo, numero } = parseTitularCedula(rep.titular_cedula);
    setForm((prev) => ({
      ...prev,
      nombre: rep.nombre,
      apellido: rep.apellido,
      tipo_cedula: tipo,
      cedula: numero,
      rif: calculateRIF(tipo, numero),
    }));
    setVincularRepresentado({ id_paciente: rep.id_paciente, id_representado: rep.id_representado });
    setVincularCitaAlTitular(true);
    setResultadosRep([]);
    setSearchRepNombre("");
    setSearchRepApellido("");
    setMensajeCargaAnterior(`Representado "${rep.nombre} ${rep.apellido}" seleccionado. Se usará la cédula del titular (${rep.titular_nombre} ${rep.titular_apellido}) para el pago. La cita aparecerá en Mis citas del titular.`);
    setFieldErrors((prev) => ({ ...prev, nombre: "", apellido: "", cedula: "" }));
  };

  const handleAbrirCrearRepresentado = () => {
    setShowCrearRepresentadoForm(true);
    setTitularYaRegistrado(null);
    setRepForm((prev) => ({
      ...prev,
      cedula_titular: cedulaCompleta || prev.cedula_titular,
      nombre_titular: form.nombre?.trim() || prev.nombre_titular,
      apellido_titular: form.apellido?.trim() || prev.apellido_titular,
    }));
    setRepFormErrors({});
  };

  const handleVerificarTitular = async () => {
    const cedula = repForm.cedula_titular.trim();
    if (!cedula || cedula.length < 6) return;
    setTitularYaRegistrado(null);
    try {
      const { paciente } = await getDatosPorCedula(cedula).unwrap();
      const tienePaciente = paciente && (paciente.nombre || paciente.apellido);
      if (tienePaciente) {
        setTitularYaRegistrado({
          nombre: paciente!.nombre || "",
          apellido: paciente!.apellido || "",
        });
      } else {
        setTitularYaRegistrado(null);
      }
    } catch {
      setTitularYaRegistrado(null);
    }
  };

  const quiereAltaTitular = !titularYaRegistrado && (repForm.nombre_titular.trim() || repForm.apellido_titular.trim());

  const validateRepForm = (): boolean => {
    const err: Record<string, string> = {};
    if (!repForm.cedula_titular.trim()) err.cedula_titular = "La cédula del titular es obligatoria.";
    if (quiereAltaTitular) {
      if (!repForm.nombre_titular.trim()) err.nombre_titular = "Nombre del titular obligatorio (titular no registrado).";
      if (!repForm.apellido_titular.trim()) err.apellido_titular = "Apellido del titular obligatorio (titular no registrado).";
      if (!repForm.genero_titular) err.genero_titular = "Género del titular obligatorio (titular no registrado).";
      else if (!["Masculino", "Femenino"].includes(repForm.genero_titular)) err.genero_titular = "Género no válido.";
      if (!repForm.fecha_nacimiento_titular) err.fecha_nacimiento_titular = "Fecha de nacimiento del titular obligatoria (titular no registrado).";
      else {
        const hoy = new Date();
        const f = new Date(repForm.fecha_nacimiento_titular);
        if (f.getTime() > hoy.getTime()) err.fecha_nacimiento_titular = "La fecha de nacimiento no puede ser futura.";
        else {
          let edad = hoy.getFullYear() - f.getFullYear();
          const mesDiff = hoy.getMonth() - f.getMonth();
          if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < f.getDate())) edad -= 1;
          if (edad < 18) err.fecha_nacimiento_titular = "El titular debe ser mayor de edad (18 años).";
        }
      }
    }
    if (!repForm.nombre.trim()) err.nombre = "El nombre es obligatorio.";
    if (!repForm.apellido.trim()) err.apellido = "El apellido es obligatorio.";
    if (!repForm.fecha_nacimiento) err.fecha_nacimiento = "La fecha de nacimiento es obligatoria.";
    else if (new Date(repForm.fecha_nacimiento).getTime() > new Date().getTime()) err.fecha_nacimiento = "La fecha de nacimiento no puede ser futura.";
    if (!repForm.genero) err.genero = "El género es obligatorio.";
    else if (!["Masculino", "Femenino"].includes(repForm.genero)) err.genero = "Género no válido.";
    if (repForm.cedula_rep.trim() && !/^\d+$/.test(repForm.cedula_rep.trim())) err.cedula_rep = "Solo números.";
    else if (repForm.cedula_rep.trim() && !validarRangoCedula(repForm.cedula_rep)) err.cedula_rep = MENSAJE_RANGO_CEDULA;
    setRepFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleCrearRepresentadoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRepForm() || loadingCrearRep) return;
    try {
      const cedulaRep = repForm.cedula_rep.trim()
        ? `${repForm.tipo_cedula_rep}${repForm.cedula_rep.trim()}`
        : undefined;
      const data = await crearRepresentado({
        cedula_titular: repForm.cedula_titular.trim(),
        nombre: formatNombreApellido(repForm.nombre),
        apellido: formatNombreApellido(repForm.apellido),
        fecha_nacimiento: repForm.fecha_nacimiento,
        genero: repForm.genero as "Masculino" | "Femenino",
        parentesco: repForm.parentesco.trim() || undefined,
        cedula: cedulaRep ?? null,
        ...(repForm.nombre_titular.trim() &&
        repForm.apellido_titular.trim() &&
        repForm.genero_titular &&
        repForm.fecha_nacimiento_titular
          ? {
              nombre_titular: formatNombreApellido(repForm.nombre_titular),
              apellido_titular: formatNombreApellido(repForm.apellido_titular),
              genero_titular: repForm.genero_titular as "Masculino" | "Femenino",
              fecha_nacimiento_titular: repForm.fecha_nacimiento_titular,
            }
          : {}),
      }).unwrap();
      const { tipo, numero } = parseTitularCedula(data.titular_cedula);
      setForm((prev) => ({
        ...prev,
        nombre: data.nombre,
        apellido: data.apellido,
        tipo_cedula: tipo,
        cedula: numero,
        rif: calculateRIF(tipo, numero),
      }));
      setVincularRepresentado({ id_paciente: data.id_paciente, id_representado: data.id_representado });
      setVincularCitaAlTitular(true);
      setShowCrearRepresentadoForm(false);
      setRepForm({ cedula_titular: "", nombre_titular: "", apellido_titular: "", genero_titular: "", fecha_nacimiento_titular: "", nombre: "", apellido: "", fecha_nacimiento: "", genero: "", parentesco: "", tipo_cedula_rep: "V", cedula_rep: "" });
      setRepFormErrors({});
      const repNombre = `${data.nombre} ${data.apellido}`.trim();
      const titularNombre = data.titular_nombre != null && data.titular_apellido != null
        ? `${data.titular_nombre} ${data.titular_apellido}`
        : null;
      const msgTitularCreado =
        titularNombre
          ? `Cuando ${titularNombre} (cédula ${data.titular_cedula}) se registre podrá reclamar sus citas y representados. `
          : "";
      const pacienteTexto = titularNombre
        ? `representado del paciente ${titularNombre} (cédula ${data.titular_cedula})`
        : `representado del titular (cédula ${data.titular_cedula})`;
      setMensajeCargaAnterior(
        `${msgTitularCreado}Cita para ${repNombre}, ${pacienteTexto}. La cita aparecerá en Mis citas del titular.`
      );
      setFieldErrors((prev) => ({ ...prev, nombre: "", apellido: "", cedula: "" }));
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "data" in err
        ? (err as { data?: { message?: string } }).data?.message
        : "No se pudo crear el representado.";
      setRepFormErrors((prev) => ({ ...prev, _form: msg }));
    }
  };

  const handleCargarDatosAnteriores = async () => {
    if (!puedeCargarAnterior) return;
    setMensajeCargaAnterior(null);
    setVincularRepresentado(null);
    setVincularCitaAlTitular(false);
    try {
      const { paciente, representado, mostrador } = await getDatosPorCedula(cedulaCompleta).unwrap();
      const tienePaciente = paciente && (paciente.nombre || paciente.apellido);
      const tieneRepresentado = representado && (representado.nombre || representado.apellido);
      const tieneMostrador = mostrador && (mostrador.nombre || mostrador.apellido);
      if (tienePaciente || tieneRepresentado || tieneMostrador) {
        const nombre = (tienePaciente ? paciente!.nombre : null) || (tieneRepresentado ? representado!.nombre : null) || (tieneMostrador ? mostrador!.nombre : null) || "";
        const apellido = (tienePaciente ? paciente!.apellido : null) || (tieneRepresentado ? representado!.apellido : null) || (tieneMostrador ? mostrador!.apellido : null) || "";
        const rif = (tieneMostrador && mostrador!.rif) ? mostrador!.rif : (tienePaciente && paciente!.rif) ? paciente!.rif : undefined;
        setForm((prev) => ({
          ...prev,
          nombre: nombre || prev.nombre,
          apellido: apellido || prev.apellido,
          rif: rif ?? prev.rif,
        }));
        setFieldErrors((prev) => ({ ...prev, nombre: "", apellido: "" }));
        if (tieneRepresentado) {
          setVincularRepresentado({ id_paciente: representado!.id_paciente, id_representado: representado!.id_representado });
          setVincularCitaAlTitular(true);
        }
        const partes = [];
        if (tienePaciente) partes.push("paciente registrado");
        if (tieneRepresentado) partes.push("representado");
        if (tieneMostrador) partes.push("cita de mostrador anterior");
        setMensajeCargaAnterior(`Datos cargados (${partes.join(", ")}). Puedes editarlos y registrar la nueva cita.${tieneRepresentado ? " Si marcas «Vincular al titular», la cita aparecerá en Mis citas del representado." : ""}`);
      } else {
        setMensajeCargaAnterior("No se encontró ningún paciente registrado, representado ni cita de mostrador previa con esta cédula.");
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
    if (!form.hora_cita?.trim()) err.hora_cita = "La hora es obligatoria.";
    if (!form.nombre?.trim()) err.nombre = "El nombre es obligatorio.";
    else if (form.nombre.trim().length > 36) err.nombre = "Máximo 36 caracteres.";
    if (!form.apellido?.trim()) err.apellido = "El apellido es obligatorio.";
    else if (form.apellido.trim().length > 36) err.apellido = "Máximo 36 caracteres.";
    if (!form.cedula?.trim() && !vincularRepresentado) err.cedula = "La cédula es obligatoria (o busca un representado por nombre).";
    else if (form.cedula?.trim() && !/^\d+$/.test(form.cedula.trim())) err.cedula = "Solo números.";
    else if (form.cedula?.trim() && !validarRangoCedula(form.cedula)) err.cedula = MENSAJE_RANGO_CEDULA;
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
      hora_cita: form.hora_cita.trim().padEnd(8, ":00").slice(0, 8),
      metodo: form.metodo,
      monto,
      tasa_dia_bcv: tasaFinal,
      nombre: formatNombreApellido(form.nombre),
      apellido: formatNombreApellido(form.apellido),
      cedula: `${form.tipo_cedula}${form.cedula}`.trim(),
      rif: form.rif.trim() || undefined,
      referencia: form.referencia.trim() || undefined,
      ...(vincularCitaAlTitular && vincularRepresentado
        ? { id_paciente: vincularRepresentado.id_paciente, id_representado: vincularRepresentado.id_representado }
        : {}),
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

          <div className="grid grid-cols-1 gap-4 min-w-0 md:grid-cols-2">
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Hora * (bloques 20 min)</label>
              <select
                name="hora_cita"
                value={form.hora_cita}
                onChange={handleChange}
                disabled={!form.id_especialista || !form.fecha_cita}
                className={`h-10 w-full min-w-0 rounded-md border px-3 text-sm disabled:opacity-50 ${fieldErrors.hora_cita ? inputError : "border-gray-300"}`}
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
              {fieldErrors.hora_cita && <p className="mt-1 text-xs text-red-500">{fieldErrors.hora_cita}</p>}
              <p className="mt-1 text-xs text-gray-500">
                Horarios que chocan con otra cita del especialista aparecen como ocupados.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 min-w-0 md:grid-cols-2">
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

          <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-4 space-y-3">
            <p className="text-sm font-medium text-teal-900">¿La cita es para un representado que aún no está registrado?</p>
            <p className="text-xs text-teal-800">
              Crea el representado y asígnalo al titular por cédula. Si el titular ya está registrado, solo llena la cédula. Si no está en el sistema, indica nombre y apellido del titular para esta cita (no se crea usuario; cuando el titular se registre con su cédula podrá reclamar sus citas y representados).
            </p>
            {!showCrearRepresentadoForm ? (
              <button
                type="button"
                onClick={handleAbrirCrearRepresentado}
                className="text-sm text-teal-600 hover:text-teal-800 hover:underline font-medium"
              >
                Crear representado nuevo y asignarlo al titular
              </button>
            ) : (
              <div className="space-y-3" role="group" aria-label="Formulario crear representado">
                {repFormErrors._form && (
                  <p className="text-sm text-red-600">{repFormErrors._form}</p>
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
                        inputClassName={`h-9 rounded border px-2 text-sm ${repFormErrors.cedula_titular ? "border-red-500" : "border-teal-300"}`}
                        selectClassName="h-9 rounded border-teal-300 text-sm"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleVerificarTitular}
                          disabled={loadingDatosPorCedula || repForm.cedula_titular.replace(/\D/g, "").length < 6}
                          className="text-sm text-teal-600 hover:text-teal-800 hover:underline disabled:opacity-50"
                        >
                          {loadingDatosPorCedula ? "Verificando…" : "Verificar si el titular ya está registrado"}
                        </button>
                      </div>
                    </div>
                    {titularYaRegistrado && (
                      <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                        <strong>Titular ya registrado:</strong> {titularYaRegistrado.nombre} {titularYaRegistrado.apellido} (cédula {repForm.cedula_titular}). Solo completa los datos del representado debajo.
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 sm:col-span-2 space-y-2">
                    <p className="text-sm font-semibold text-teal-900 border-b border-teal-200 pb-1">Datos del titular</p>
                    <p className="text-xs font-medium text-teal-800">Si el titular no está registrado, indica nombre y apellido para esta cita (no se crea cuenta; al registrarse con su cédula podrá reclamar citas y representados):</p>
                    <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2">
                      <div className="min-w-0">
                        <label className="mb-0.5 block text-xs text-teal-900">Nombre del titular *</label>
                        <input
                          type="text"
                          value={repForm.nombre_titular}
                          onChange={(e) => setRepForm((p) => ({ ...p, nombre_titular: e.target.value }))}
                          placeholder="Nombre del titular"
                          className={`h-9 w-full rounded border px-2 text-sm ${repFormErrors.nombre_titular ? "border-red-500" : "border-teal-300"}`}
                        />
                        {repFormErrors.nombre_titular && <p className="text-xs text-red-500">{repFormErrors.nombre_titular}</p>}
                      </div>
                      <div className="min-w-0">
                        <label className="mb-0.5 block text-xs text-teal-900">Apellido del titular *</label>
                        <input
                          type="text"
                          value={repForm.apellido_titular}
                          onChange={(e) => setRepForm((p) => ({ ...p, apellido_titular: e.target.value }))}
                          placeholder="Apellido del titular"
                          className={`h-9 w-full rounded border px-2 text-sm ${repFormErrors.apellido_titular ? "border-red-500" : "border-teal-300"}`}
                        />
                        {repFormErrors.apellido_titular && <p className="text-xs text-red-500">{repFormErrors.apellido_titular}</p>}
                      </div>
                      <div className="min-w-0">
                        <label className="mb-0.5 block text-xs text-teal-900">Género del titular *</label>
                        <select
                          value={repForm.genero_titular}
                          onChange={(e) => setRepForm((p) => ({ ...p, genero_titular: e.target.value as typeof repForm.genero_titular }))}
                          className={`h-9 w-full rounded border px-2 text-sm ${repFormErrors.genero_titular ? "border-red-500" : "border-teal-300"}`}
                        >
                          <option value="">Selecciona</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Femenino">Femenino</option>
                        </select>
                        {repFormErrors.genero_titular && <p className="text-xs text-red-500">{repFormErrors.genero_titular}</p>}
                      </div>
                      <div className="min-w-0">
                        <label className="mb-0.5 block text-xs text-teal-900">Fecha nac. titular *</label>
                        <input
                          type="date"
                          value={repForm.fecha_nacimiento_titular}
                          onChange={(e) => setRepForm((p) => ({ ...p, fecha_nacimiento_titular: e.target.value }))}
                          className={`h-9 w-full rounded border px-2 text-sm ${repFormErrors.fecha_nacimiento_titular ? "border-red-500" : "border-teal-300"}`}
                        />
                        {repFormErrors.fecha_nacimiento_titular && <p className="text-xs text-red-500">{repFormErrors.fecha_nacimiento_titular}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 sm:col-span-2 space-y-2">
                    <p className="text-sm font-semibold text-teal-900 border-b border-teal-200 pb-1">Datos del representado</p>
                    <div className="min-w-0 flex gap-1">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium text-teal-900">Nombre representado *</label>
                      <input
                        type="text"
                        value={repForm.nombre}
                        onChange={(e) => setRepForm((p) => ({ ...p, nombre: e.target.value }))}
                        className={`h-9 w-full rounded border px-2 text-sm ${repFormErrors.nombre ? "border-red-500" : "border-teal-300"}`}
                      />
                      {repFormErrors.nombre && <p className="text-xs text-red-500">{repFormErrors.nombre}</p>}
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium text-teal-900">Apellido *</label>
                      <input
                        type="text"
                        value={repForm.apellido}
                        onChange={(e) => setRepForm((p) => ({ ...p, apellido: e.target.value }))}
                        className={`h-9 w-full rounded border px-2 text-sm ${repFormErrors.apellido ? "border-red-500" : "border-teal-300"}`}
                      />
                      {repFormErrors.apellido && <p className="text-xs text-red-500">{repFormErrors.apellido}</p>}
                    </div>
                  </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="mb-1 block text-xs font-medium text-teal-900">Fecha nacimiento *</label>
                    <input
                      type="date"
                      value={repForm.fecha_nacimiento}
                      onChange={(e) => setRepForm((p) => ({ ...p, fecha_nacimiento: e.target.value }))}
                      className={`h-9 w-full rounded border px-2 text-sm ${repFormErrors.fecha_nacimiento ? "border-red-500" : "border-teal-300"}`}
                    />
                    {repFormErrors.fecha_nacimiento && <p className="text-xs text-red-500">{repFormErrors.fecha_nacimiento}</p>}
                  </div>
                  <div className="min-w-0">
                    <label className="mb-1 block text-xs font-medium text-teal-900">Género *</label>
                    <select
                      value={repForm.genero}
                      onChange={(e) => setRepForm((p) => ({ ...p, genero: e.target.value as typeof repForm.genero }))}
                      className={`h-9 w-full rounded border px-2 text-sm ${repFormErrors.genero ? "border-red-500" : "border-teal-300"}`}
                    >
                      <option value="">Selecciona</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </select>
                    {repFormErrors.genero && <p className="text-xs text-red-500">{repFormErrors.genero}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="mb-1 block text-xs font-medium text-teal-900">Parentesco (opcional)</label>
                    <input
                      type="text"
                      value={repForm.parentesco}
                      onChange={(e) => setRepForm((p) => ({ ...p, parentesco: e.target.value }))}
                      placeholder="Ej. Hijo/a"
                      className="h-9 w-full rounded border border-teal-300 px-2 text-sm"
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
                      inputClassName={`h-9 rounded border px-2 text-sm ${repFormErrors.cedula_rep ? "border-red-500" : "border-teal-300"}`}
                      selectClassName="h-9 rounded border-teal-300 text-sm"
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
                    className="h-9 rounded bg-teal-600 px-3 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {loadingCrearRep ? "Creando…" : "Crear representado y usar en esta cita"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCrearRepresentadoForm(false); setRepFormErrors({}); }}
                    className="h-9 rounded border border-teal-300 px-3 text-sm text-teal-700 hover:bg-teal-100"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
            <p className="text-sm font-medium text-amber-900">Si es un menor sin cédula</p>
            <p className="text-xs text-amber-800">
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
                  className="h-10 w-full rounded-md border border-amber-300 bg-white px-3 text-sm"
                />
              </div>
              <div className="min-w-0 flex-1">
                <label className="sr-only">Apellido del representado</label>
                <input
                  type="text"
                  placeholder="Apellido"
                  value={searchRepApellido}
                  onChange={(e) => setSearchRepApellido(e.target.value)}
                  className="h-10 w-full rounded-md border border-amber-300 bg-white px-3 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleBuscarRepresentadoPorNombre}
                disabled={loadingBuscarRep || (!searchRepNombre.trim() && !searchRepApellido.trim())}
                className="h-10 rounded-md bg-amber-600 px-3 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {loadingBuscarRep ? "Buscando…" : "Buscar representado"}
              </button>
            </div>
            {resultadosRep.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-900">Selecciona el representado:</p>
                <ul className="max-h-40 overflow-y-auto rounded-md border border-amber-200 bg-white">
                  {resultadosRep.map((rep) => (
                    <li key={rep.id_representado}>
                      <button
                        type="button"
                        onClick={() => handleSeleccionarRepresentado(rep)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-amber-100"
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
                label={vincularRepresentado ? "Cédula (del titular para el pago; opcional)" : "Cédula *"}
                value={`${form.tipo_cedula}${form.cedula}`}
                onChange={(tipo, numero) => {
                  setForm((prev) => ({ ...prev, tipo_cedula: tipo, cedula: numero }));
                  setMensajeCargaAnterior(null);
                  if (fieldErrors.cedula) setFieldErrors((prev) => ({ ...prev, cedula: "" }));
                }}
                error={fieldErrors.cedula}
                required={!vincularRepresentado}
                inputClassName={`h-10 rounded-md text-sm ${fieldErrors.cedula ? "border-red-500" : "border-gray-300"}`}
                selectClassName="h-10 rounded-md border-gray-300 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Con la cédula puedes cargar nombre, apellido y RIF: se buscan pacientes registrados, representados y citas de mostrador anteriores.
              </p>
              {puedeCargarAnterior && (
                <div className="mt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleCargarDatosAnteriores}
                    disabled={loadingDatosPorCedula}
                    className="text-sm text-teal-600 hover:text-teal-800 hover:underline disabled:opacity-50"
                  >
                    {loadingDatosPorCedula ? "Buscando…" : "Cargar datos por cédula"}
                  </button>
                  {vincularRepresentado && (
                    <label className="mt-2 flex items-start gap-2 text-sm text-gray-700">
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
