import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Swal from "sweetalert2";
import { PageShell } from "../../../shared";
import { BANCOS_VENEZUELA } from "../../../data/bancosVenezuela";
import {
  useCrearMetodoPagoMutation,
  useDeleteMetodoPagoMutation,
  useListMetodosPagoQuery,
  useUpdateMetodoPagoMutation,
  useUpdateEstadoMetodoPagoMutation,
} from "../adminApi";

const MetodosPagoPage = () => {
  const [form, setForm] = useState({
    nombre: "",
    banco_codigo: "",
    moneda: "BS" as "BS" | "USD",
    tipo_pago_bs: "Transferencia" as "Transferencia" | "PagoMovil",
    tipo_pago_usd: "",
    titular_identificacion_tipo: "V" as "V" | "E" | "J",
    titular_identificacion_numero: "",
    correo: "",
    telefono: "",
    numero_cuenta: "",
    imagen: null as File | null,
  });

  const { data: metodos = [], isLoading } = useListMetodosPagoQuery();
  const [crearMetodoPago, { isLoading: isCreating }] = useCrearMetodoPagoMutation();
  const [updateMetodoPago, { isLoading: isEditing }] = useUpdateMetodoPagoMutation();
  const [updateEstadoMetodoPago, { isLoading: isUpdating }] =
    useUpdateEstadoMetodoPagoMutation();
  const [deleteMetodoPago, { isLoading: isDeleting }] = useDeleteMetodoPagoMutation();
  const [editingMetodoId, setEditingMetodoId] = useState<string | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState("");

  const previewImagen = useMemo(
    () => (form.imagen ? URL.createObjectURL(form.imagen) : ""),
    [form.imagen],
  );
  const previewImagenFinal = previewImagen || editingImageUrl;

  useEffect(() => {
    return () => {
      if (previewImagen) {
        URL.revokeObjectURL(previewImagen);
      }
    };
  }, [previewImagen]);

  const selectedBanco = useMemo(
    () => BANCOS_VENEZUELA.find((banco) => banco.Code === form.banco_codigo),
    [form.banco_codigo],
  );

  const bsTipoOptions = useMemo(() => {
    if (!selectedBanco) {
      return ["Transferencia", "PagoMovil"] as Array<"Transferencia" | "PagoMovil">;
    }

    const services = String(selectedBanco.Services || "").toUpperCase();
    const options: Array<"Transferencia" | "PagoMovil"> = [];

    if (services.includes("TRF")) {
      options.push("Transferencia");
    }
    if (services.includes("P2P")) {
      options.push("PagoMovil");
    }

    return options.length ? options : (["Transferencia", "PagoMovil"] as Array<"Transferencia" | "PagoMovil">);
  }, [selectedBanco]);

  const bancosDisponibles = useMemo(() => {
    if (form.moneda !== "BS") {
      return BANCOS_VENEZUELA;
    }

    if (form.tipo_pago_bs === "Transferencia") {
      return BANCOS_VENEZUELA.filter((b) => b.Services.includes("TRF"));
    }

    return BANCOS_VENEZUELA.filter((b) => b.Services.includes("P2P"));
  }, [form.moneda, form.tipo_pago_bs]);

  useEffect(() => {
    if (!form.banco_codigo) return;
    const existeBanco = bancosDisponibles.some(
      (banco) => banco.Code === form.banco_codigo,
    );
    if (!existeBanco) {
      setForm((prev) => ({ ...prev, banco_codigo: "" }));
    }
  }, [bancosDisponibles, form.banco_codigo]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, imagen: file }));
  };

  const onEdit = (metodo: (typeof metodos)[number]) => {
    const identificacion = String(metodo.titular_identificacion || "").toUpperCase();
    const match = identificacion.match(/^([VEJ])(\d+)$/);
    const tipo = (match?.[1] as "V" | "E" | "J" | undefined) || "V";
    const numero = match?.[2] || "";

    setEditingMetodoId(metodo.id_metodo_pago);
    setEditingImageUrl(metodo.imagen_url || "");
    setForm({
      nombre: metodo.nombre || "",
      banco_codigo: metodo.moneda === "USD" ? "" : metodo.banco_codigo || "",
      moneda: metodo.moneda || "BS",
      tipo_pago_bs:
        metodo.tipo_pago === "PagoMovil" ? "PagoMovil" : "Transferencia",
      tipo_pago_usd: metodo.moneda === "USD" ? metodo.tipo_pago || "" : "",
      titular_identificacion_tipo: tipo,
      titular_identificacion_numero: numero,
      correo: metodo.correo || "",
      telefono: metodo.telefono || "",
      numero_cuenta: metodo.numero_cuenta || "",
      imagen: null,
    });
  };

  const cancelEdit = () => {
    setEditingMetodoId(null);
    setEditingImageUrl("");
    resetForm();
  };

  const resetForm = () => {
    setForm({
      nombre: "",
      banco_codigo: "",
      moneda: "BS",
      tipo_pago_bs: "Transferencia",
      tipo_pago_usd: "",
      titular_identificacion_tipo: "V",
      titular_identificacion_numero: "",
      correo: "",
      telefono: "",
      numero_cuenta: "",
      imagen: null,
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const isUsd = form.moneda === "USD";
    const identificacionNumero = String(
      form.titular_identificacion_numero || "",
    )
      .replace(/\D/g, "")
      .trim();
    const identificacionCompuesta = `${form.titular_identificacion_tipo}${identificacionNumero}`;

    if (!form.nombre.trim()) {
      void Swal.fire("Validación", "El nombre del método es requerido", "warning");
      return;
    }

    if (!isUsd && !form.banco_codigo) {
      void Swal.fire("Validación", "Debe seleccionar un banco", "warning");
      return;
    }

    if (!isUsd && !selectedBanco) {
      void Swal.fire("Validación", "Banco inválido", "warning");
      return;
    }

    if (!form.imagen && !editingMetodoId && !editingImageUrl) {
      void Swal.fire("Validación", "Debe subir una imagen del método", "warning");
      return;
    }

    const tipoPago = isUsd ? form.tipo_pago_usd.trim() : form.tipo_pago_bs;
    const bancoCodigo = isUsd ? "USD" : String(selectedBanco?.Code || "");
    const bancoNombre = isUsd
      ? "No aplica (USD)"
      : String(selectedBanco?.Name || "");

    if (!tipoPago) {
      void Swal.fire("Validación", "Debe indicar el tipo de pago", "warning");
      return;
    }

    if (isUsd) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.correo.trim())) {
        void Swal.fire("Validación", "Para USD debe indicar un correo válido", "warning");
        return;
      }
    } else {
      if (!identificacionNumero) {
        void Swal.fire(
          "Validación",
          "Debe indicar la identificación del titular",
          "warning",
        );
        return;
      }

      const regexIdentificacion = /^(V|E|J)\d{5,12}$/i;
      if (!regexIdentificacion.test(identificacionCompuesta)) {
        void Swal.fire(
          "Validación",
          "La identificación debe tener formato V/E/J seguido de números",
          "warning",
        );
        return;
      }

      if (form.tipo_pago_bs === "PagoMovil" && !form.telefono.trim()) {
        void Swal.fire(
          "Validación",
          "Para Pago móvil debe indicar un teléfono",
          "warning",
        );
        return;
      }

      if (
        form.tipo_pago_bs === "Transferencia" &&
        !form.numero_cuenta.trim()
      ) {
        void Swal.fire(
          "Validación",
          "Para Transferencia debe indicar un número de cuenta",
          "warning",
        );
        return;
      }

    }

    try {
      const payload = {
        nombre: form.nombre.trim(),
        banco_codigo: bancoCodigo,
        banco_nombre: bancoNombre,
        tipo_pago: tipoPago,
        moneda: form.moneda,
        titular_identificacion: !isUsd
          ? identificacionCompuesta
          : undefined,
        titular_identificacion_tipo: !isUsd
          ? form.titular_identificacion_tipo
          : undefined,
        titular_identificacion_numero: !isUsd
          ? identificacionNumero
          : undefined,
        correo: isUsd ? form.correo.trim() : undefined,
        telefono:
          !isUsd && form.tipo_pago_bs === "PagoMovil"
            ? form.telefono.trim()
            : undefined,
        numero_cuenta:
          !isUsd && form.tipo_pago_bs === "Transferencia"
            ? form.numero_cuenta.trim()
            : undefined,
        imagen: form.imagen || undefined,
      };

      if (editingMetodoId) {
        await updateMetodoPago({ id: editingMetodoId, payload }).unwrap();
        void Swal.fire("Listo", "Método de pago actualizado", "success");
        setEditingMetodoId(null);
        setEditingImageUrl("");
      } else {
        await crearMetodoPago(payload as any).unwrap();
        void Swal.fire("Listo", "Método de pago creado", "success");
      }

      resetForm();
    } catch (error: any) {
      void Swal.fire(
        "Error",
        error?.data?.message || "No se pudo crear el método de pago",
        "error",
      );
    }
  };

  const onToggleEstado = async (id: string, activoActual: boolean) => {
    try {
      await updateEstadoMetodoPago({ id, activo: !activoActual }).unwrap();
    } catch (error: any) {
      void Swal.fire(
        "Error",
        error?.data?.message || "No se pudo actualizar el estado",
        "error",
      );
    }
  };

  const onDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar método?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!confirm.isConfirmed) return;

    try {
      await deleteMetodoPago(id).unwrap();
      void Swal.fire("Eliminado", "Método eliminado exitosamente", "success");
    } catch (error: any) {
      void Swal.fire(
        "Error",
        error?.data?.message || "No se pudo eliminar el método",
        "error",
      );
    }
  };

  return (
    <PageShell
      title="Métodos de pago"
      description="Configura los métodos de pago visibles para Garbis"
    >
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-brand-200 bg-paper p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-brand-900">Agregar método</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-700">Moneda</label>
              <select
                value={form.moneda}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    moneda: e.target.value as "BS" | "USD",
                    banco_codigo: "",
                    titular_identificacion_tipo: "V",
                    titular_identificacion_numero: "",
                    telefono: "",
                    numero_cuenta: "",
                  }))
                }
                className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
              >
                <option value="BS">Bolívares (BS)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-brand-700">
                Nombre
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Banco de Venezuela Pago Móvil"
                className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
              />
            </div>

            {form.moneda === "BS" ? (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-brand-700">
                    Tipo de pago
                  </label>
                  <select
                    value={form.tipo_pago_bs}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        tipo_pago_bs: e.target.value as "Transferencia" | "PagoMovil",
                        banco_codigo: "",
                        titular_identificacion_numero: "",
                        telefono: "",
                        numero_cuenta: "",
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
                  >
                    {bsTipoOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "PagoMovil" ? "Pago móvil" : "Transferencia"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-brand-700">Banco</label>
                  <select
                    value={form.banco_codigo}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        banco_codigo: e.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
                  >
                    <option value="">Seleccione un banco</option>
                    {bancosDisponibles.map((banco) => (
                      <option key={banco.Code} value={banco.Code}>
                        {`${banco.Code} - ${banco.Name}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-brand-700">
                    Identificación
                  </label>
                  <div className="grid grid-cols-[88px_1fr] gap-2">
                    <select
                      value={form.titular_identificacion_tipo}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          titular_identificacion_tipo: e.target
                            .value as "V" | "E" | "J",
                        }))
                      }
                      className="h-10 rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
                    >
                      <option value="V">V</option>
                      <option value="E">E</option>
                      <option value="J">J</option>
                    </select>
                    <input
                      type="text"
                      value={form.titular_identificacion_numero}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          titular_identificacion_numero: e.target.value.replace(
                            /\D/g,
                            "",
                          ),
                        }))
                      }
                      placeholder="Ej: 28025174"
                      className="h-10 rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
                {form.tipo_pago_bs === "PagoMovil" ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-brand-700">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={form.telefono}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, telefono: e.target.value }))
                      }
                      placeholder="Ej: 04141234567"
                      className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
                    />
                  </div>
                ) : null}
                {form.tipo_pago_bs === "Transferencia" ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-brand-700">
                      Número de cuenta
                    </label>
                    <input
                      type="text"
                      value={form.numero_cuenta}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          numero_cuenta: e.target.value,
                        }))
                      }
                      placeholder="Ej: 01021234123412341234"
                      className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-brand-700">
                    Tipo de pago (libre)
                  </label>
                  <input
                    type="text"
                    value={form.tipo_pago_usd}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, tipo_pago_usd: e.target.value }))
                    }
                    placeholder="Ej: Zelle, PayPal, Binance..."
                    className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-brand-700">
                    Correo
                  </label>
                  <input
                    type="email"
                    value={form.correo}
                    onChange={(e) => setForm((prev) => ({ ...prev, correo: e.target.value }))}
                    placeholder="correo@ejemplo.com"
                    className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-brand-700">Imagen</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={onFileChange}
                className="block w-full text-sm text-brand-800 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-900 hover:file:bg-brand-200"
              />
              {previewImagenFinal ? (
                <div className="mt-3 rounded-lg border border-brand-200 p-2">
                  <p className="mb-2 text-xs text-brand-700">Previsualización</p>
                  <img
                    src={previewImagenFinal}
                    alt="Previsualización método de pago"
                    className="h-28 w-28 rounded-lg border border-brand-200 object-cover"
                  />
                </div>
              ) : null}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isCreating || isEditing}
                className="w-full rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800 disabled:opacity-50"
              >
                {isEditing
                  ? "Actualizando..."
                  : isCreating
                    ? "Guardando..."
                    : editingMetodoId
                      ? "Actualizar método"
                      : "Guardar método"}
              </button>
              {editingMetodoId ? (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-800"
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-brand-200 bg-paper p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-brand-900">Métodos registrados</h2>
          {isLoading ? (
            <p className="text-sm text-brand-700">Cargando métodos...</p>
          ) : metodos.length === 0 ? (
            <p className="text-sm text-brand-700">No hay métodos de pago registrados.</p>
          ) : (
            <div className="space-y-3">
              {metodos.map((metodo) => (
                <div
                  key={metodo.id_metodo_pago}
                  className="flex flex-col gap-3 rounded-xl border border-brand-200 p-3 md:flex-row md:items-center"
                >
                  <img
                    src={metodo.imagen_url}
                    alt={metodo.nombre}
                    className="h-16 w-16 rounded-lg border border-brand-200 object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-brand-900">{metodo.nombre}</p>
                    <p className="text-xs text-brand-700">
                      {`${metodo.banco_codigo} - ${metodo.banco_nombre}`} · {metodo.tipo_pago} · {metodo.moneda}
                    </p>
                    {metodo.correo ? (
                      <p className="text-xs text-brand-700">Correo: {metodo.correo}</p>
                    ) : null}
                    {metodo.titular_identificacion ? (
                      <p className="text-xs text-brand-700">
                        Identificación: {metodo.titular_identificacion}
                      </p>
                    ) : null}
                    {metodo.telefono ? (
                      <p className="text-xs text-brand-700">Teléfono: {metodo.telefono}</p>
                    ) : null}
                    {metodo.numero_cuenta ? (
                      <p className="text-xs text-brand-700">
                        Cuenta: {metodo.numero_cuenta}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleEstado(metodo.id_metodo_pago, Boolean(metodo.activo))}
                      disabled={isUpdating}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${metodo.activo
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                        }`}
                    >
                      {metodo.activo ? "Activo" : "Inactivo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(metodo)}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(metodo.id_metodo_pago)}
                      disabled={isDeleting}
                      className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default MetodosPagoPage;
