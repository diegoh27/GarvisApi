import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { PasswordField, useAuth } from "../../../shared";
import { apiClient } from "../../../services/apiClient";

type PerfilData = {
  nombre?: string;
  apellido?: string;
  genero?: string | null;
  correo?: string;
  cedula?: string;
  telefono?: string;
  especialidad?: string;
  fecha_nacimiento?: string | null;
  tipo_sangre?: string | null;
  descripcion?: string | null;
  direccion?: string | null;
  contacto_emergencia_nombre?: string | null;
  contacto_emergencia_telefono?: string | null;
};

const ConfiguracionPage = () => {
  const { user, token } = useAuth();
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [genero, setGenero] = useState("");
  const [correo, setCorreo] = useState("");
  const [cedula, setCedula] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipoSangre, setTipoSangre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [direccion, setDireccion] = useState("");
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [editTelefono, setEditTelefono] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEspecialista = user?.rol === "especialista";
  const isPaciente = user?.rol === "paciente";
  const isModerador = user?.rol === "moderador";
  const isAdmin = user?.rol === "admin";

  const fetchPerfil = useCallback(async () => {
    if (!token) return;
    if (!isPaciente && !isEspecialista && !isModerador && !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      let endpoint = "";
      if (isEspecialista) {
        endpoint = "/medicos/mi-perfil";
      } else if (isPaciente) {
        endpoint = "/pacientes/mi-perfil";
      } else if (isModerador) {
        endpoint = "/moderadores/mi-perfil";
      } else if (isAdmin) {
        endpoint = "/users/mi-perfil";
      }
      const response = await apiClient.get<{ ok: boolean; data: PerfilData }>(
        endpoint,
      );
      const data = response.data;
      setPerfil(data);
      setNombre(data?.nombre ?? "");
      setApellido(data?.apellido ?? "");
      setGenero(data?.genero ?? "");
      setCorreo(data?.correo ?? "");
      setCedula(data?.cedula ?? "");
      setFechaNacimiento(data?.fecha_nacimiento?.slice(0, 10) ?? "");
      setTelefono(data?.telefono ?? "");
      setTipoSangre(data?.tipo_sangre ?? "");
      setDescripcion(data?.descripcion ?? "");
      setDireccion(data?.direccion ?? "");
      setContactoNombre(data?.contacto_emergencia_nombre ?? "");
      setContactoTelefono(data?.contacto_emergencia_telefono ?? "");
      setEditTelefono(false);
    } catch (err) {
      setError((err as Error).message ?? "No se pudo cargar el perfil");
    } finally {
      setLoading(false);
    }
  }, [isEspecialista, isPaciente, isModerador, isAdmin, token]);

  useEffect(() => {
    fetchPerfil();
  }, [fetchPerfil]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!isPaciente && !isEspecialista && !isModerador && !isAdmin) {
      setError(
        "Esta sección está disponible para pacientes, especialistas, moderadores y admin.",
      );
      return;
    }

    if (contrasena && contrasena !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const payload: {
      nombre?: string;
      apellido?: string;
      genero?: string;
      cedula?: string;
      correo?: string;
      fecha_nacimiento?: string;
      telefono?: string;
      contrasena?: string;
      tipo_sangre?: string;
      descripcion?: string;
      direccion?: string;
      contacto_emergencia_nombre?: string;
      contacto_emergencia_telefono?: string;
    } = {};
    const allowPhoneEdit = isAdmin || editTelefono;
    if (allowPhoneEdit && telefono !== (perfil?.telefono ?? "")) {
      payload.telefono = telefono;
    }
    if (isAdmin) {
      if (nombre !== (perfil?.nombre ?? "")) {
        payload.nombre = nombre;
      }
      if (apellido !== (perfil?.apellido ?? "")) {
        payload.apellido = apellido;
      }
      if (genero !== (perfil?.genero ?? "")) {
        payload.genero = genero;
      }
      if (cedula !== (perfil?.cedula ?? "")) {
        payload.cedula = cedula;
      }
      if (correo !== (perfil?.correo ?? "")) {
        payload.correo = correo;
      }
      if (fechaNacimiento !== (perfil?.fecha_nacimiento?.slice(0, 10) ?? "")) {
        payload.fecha_nacimiento = fechaNacimiento;
      }
    }
    if (isPaciente) {
      if (tipoSangre !== (perfil?.tipo_sangre ?? "")) {
        payload.tipo_sangre = tipoSangre;
      }
      if (descripcion !== (perfil?.descripcion ?? "")) {
        payload.descripcion = descripcion;
      }
      if (direccion !== (perfil?.direccion ?? "")) {
        payload.direccion = direccion;
      }
      if (contactoNombre !== (perfil?.contacto_emergencia_nombre ?? "")) {
        payload.contacto_emergencia_nombre = contactoNombre;
      }
      if (contactoTelefono !== (perfil?.contacto_emergencia_telefono ?? "")) {
        payload.contacto_emergencia_telefono = contactoTelefono;
      }
    }
    if (contrasena) {
      payload.contrasena = contrasena;
    }

    if (Object.keys(payload).length === 0) {
      setError("No hay cambios para guardar.");
      return;
    }

    setSaving(true);
    try {
      let endpoint = "";
      if (isEspecialista) {
        endpoint = "/medicos/mi-perfil";
      } else if (isPaciente) {
        endpoint = "/pacientes/mi-perfil";
      } else if (isModerador) {
        endpoint = "/moderadores/mi-perfil";
      } else if (isAdmin) {
        endpoint = "/users/mi-perfil";
      }
      await apiClient.patch(endpoint, payload);
      setContrasena("");
      setConfirmar("");
      await fetchPerfil();
      await Swal.fire({
        title: "Cambios guardados",
        text: "Tu información se actualizó correctamente.",
        icon: "success",
        confirmButtonText: "Listo",
        confirmButtonColor: "#1C837F",
      });
    } catch (err) {
      setError((err as Error).message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    const telefonoChanged =
      (isAdmin || editTelefono) && telefono !== (perfil?.telefono ?? "");
    const adminChanged =
      isAdmin &&
      (nombre !== (perfil?.nombre ?? "") ||
        apellido !== (perfil?.apellido ?? "") ||
        genero !== (perfil?.genero ?? "") ||
        cedula !== (perfil?.cedula ?? "") ||
        correo !== (perfil?.correo ?? "") ||
        fechaNacimiento !== (perfil?.fecha_nacimiento?.slice(0, 10) ?? ""));
    const pacienteChanged =
      isPaciente &&
      (tipoSangre !== (perfil?.tipo_sangre ?? "") ||
        descripcion !== (perfil?.descripcion ?? "") ||
        direccion !== (perfil?.direccion ?? "") ||
        contactoNombre !== (perfil?.contacto_emergencia_nombre ?? "") ||
        contactoTelefono !== (perfil?.contacto_emergencia_telefono ?? ""));
    const passwordChanged = !!contrasena;
    return telefonoChanged || passwordChanged || pacienteChanged || adminChanged;
  }, [
    apellido,
    contrasena,
    contactoNombre,
    contactoTelefono,
    correo,
    cedula,
    descripcion,
    direccion,
    editTelefono,
    fechaNacimiento,
    genero,
    isAdmin,
    isPaciente,
    nombre,
    perfil?.contacto_emergencia_nombre,
    perfil?.contacto_emergencia_telefono,
    perfil?.correo,
    perfil?.cedula,
    perfil?.descripcion,
    perfil?.direccion,
    perfil?.fecha_nacimiento,
    perfil?.genero,
    perfil?.nombre,
    perfil?.apellido,
    perfil?.telefono,
    perfil?.tipo_sangre,
    telefono,
    tipoSangre,
  ]);

  const handleCancelChanges = () => {
    setNombre(perfil?.nombre ?? "");
    setApellido(perfil?.apellido ?? "");
    setGenero(perfil?.genero ?? "");
    setCorreo(perfil?.correo ?? "");
    setCedula(perfil?.cedula ?? "");
    setFechaNacimiento(perfil?.fecha_nacimiento?.slice(0, 10) ?? "");
    setTelefono(perfil?.telefono ?? "");
    setTipoSangre(perfil?.tipo_sangre ?? "");
    setDescripcion(perfil?.descripcion ?? "");
    setDireccion(perfil?.direccion ?? "");
    setContactoNombre(perfil?.contacto_emergencia_nombre ?? "");
    setContactoTelefono(perfil?.contacto_emergencia_telefono ?? "");
    setContrasena("");
    setConfirmar("");
    setEditTelefono(false);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-brand-900">Configuración</h1>
        <p className="text-sm text-brand-800">
          Visualiza tu perfil y actualiza los datos permitidos.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl bg-paper p-6 shadow-sm">
          <h2 className="text-base font-semibold text-brand-900">
            Información personal
          </h2>
          <p className="mt-1 text-xs text-brand-800">
            Estos datos son de solo lectura.
          </p>

          {loading ? (
            <p className="mt-4 text-sm text-brand-800">Cargando...</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 text-xs text-brand-800">
                <label className="font-semibold">Nombre</label>
                <input
                  value={perfil?.nombre ?? ""}
                  disabled
                  className="w-full rounded-xl border border-mist bg-cloud px-3 py-2 text-xs text-brand-900"
                />
              </div>
              <div className="space-y-1 text-xs text-brand-800">
                <label className="font-semibold">Apellido</label>
                <input
                  value={perfil?.apellido ?? ""}
                  disabled
                  className="w-full rounded-xl border border-mist bg-cloud px-3 py-2 text-xs text-brand-900"
                />
              </div>
              <div className="space-y-1 text-xs text-brand-800">
                <label className="font-semibold">Correo</label>
                <input
                  value={perfil?.correo ?? ""}
                  disabled
                  className="w-full rounded-xl border border-mist bg-cloud px-3 py-2 text-xs text-brand-900"
                />
              </div>
              <div className="space-y-1 text-xs text-brand-800">
                <label className="font-semibold">Cédula</label>
                <input
                  value={perfil?.cedula ?? ""}
                  disabled
                  className="w-full rounded-xl border border-mist bg-cloud px-3 py-2 text-xs text-brand-900"
                />
              </div>
              {perfil?.especialidad ? (
                <div className="space-y-1 text-xs text-brand-800">
                  <label className="font-semibold">Especialidad</label>
                  <input
                    value={perfil.especialidad}
                    disabled
                    className="w-full rounded-xl border border-mist bg-cloud px-3 py-2 text-xs text-brand-900"
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-paper p-6 shadow-sm">
          <h2 className="text-base font-semibold text-brand-900">
            Datos actualizables
          </h2>
          <p className="mt-1 text-xs text-brand-800">
            Puedes editar teléfono y contraseña. Si eres paciente, también puedes actualizar tu información clínica y de contacto.
          </p>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            {isAdmin && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 text-xs text-brand-800">
                    <label className="font-semibold">Nombre</label>
                    <input
                      value={nombre}
                      onChange={(event) => setNombre(event.target.value)}
                      className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
                    />
                  </div>
                  <div className="space-y-1 text-xs text-brand-800">
                    <label className="font-semibold">Apellido</label>
                    <input
                      value={apellido}
                      onChange={(event) => setApellido(event.target.value)}
                      className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 text-xs text-brand-800">
                    <label className="font-semibold">Cédula</label>
                    <input
                      value={cedula}
                      onChange={(event) => setCedula(event.target.value)}
                      className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
                    />
                  </div>
                  <div className="space-y-1 text-xs text-brand-800">
                    <label className="font-semibold">Correo</label>
                    <input
                      value={correo}
                      onChange={(event) => setCorreo(event.target.value)}
                      className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 text-xs text-brand-800">
                    <label className="font-semibold">Género</label>
                    <select
                      value={genero}
                      onChange={(event) => setGenero(event.target.value)}
                      className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
                    >
                      <option value="">Selecciona</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div className="space-y-1 text-xs text-brand-800">
                    <label className="font-semibold">Fecha nacimiento</label>
                    <input
                      type="date"
                      value={fechaNacimiento}
                      onChange={(event) => setFechaNacimiento(event.target.value)}
                      className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2 text-xs text-brand-800">
              <div className="flex items-center justify-between">
                <label className="font-semibold">Teléfono</label>
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => setEditTelefono((prev) => !prev)}
                    className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800"
                  >
                    {editTelefono ? "Cancelar edición" : "Editar"}
                  </button>
                )}
              </div>
              {isAdmin || editTelefono ? (
                <input
                  value={telefono}
                  onChange={(event) => setTelefono(event.target.value)}
                  className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
                />
              ) : (
                <input
                  value={telefono || perfil?.telefono || ""}
                  disabled
                  className="w-full rounded-xl border border-mist bg-cloud px-3 py-2 text-xs text-brand-900"
                />
              )}
            </div>
            <div className="space-y-1 text-xs text-brand-800">
              <label className="font-semibold">Nueva contraseña</label>
              <PasswordField
                value={contrasena}
                onChange={setContrasena}
                placeholder="••••••••"
                className="w-full rounded-xl border border-mist bg-paper px-3 py-2 pr-10 text-xs text-brand-900 outline-none focus:border-brand-700"
              />
            </div>
            <div className="space-y-1 text-xs text-brand-800">
              <label className="font-semibold">Confirmar contraseña</label>
              <PasswordField
                value={confirmar}
                onChange={setConfirmar}
                placeholder="••••••••"
                className="w-full rounded-xl border border-mist bg-paper px-3 py-2 pr-10 text-xs text-brand-900 outline-none focus:border-brand-700"
              />
            </div>
            {isPaciente && (
              <div className="space-y-3">
                <div className="space-y-1 text-xs text-brand-800">
                  <label className="font-semibold">Tipo de sangre</label>
                  <input
                    value={tipoSangre}
                    onChange={(event) => setTipoSangre(event.target.value)}
                    className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
                    placeholder="Ej: O+"
                  />
                </div>
                <div className="space-y-1 text-xs text-brand-800">
                  <label className="font-semibold">Descripcion</label>
                  <textarea
                    value={descripcion}
                    onChange={(event) => setDescripcion(event.target.value)}
                    className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
                    rows={3}
                    placeholder="Notas o condiciones relevantes"
                  />
                </div>
                <div className="space-y-1 text-xs text-brand-800">
                  <label className="font-semibold">Direccion</label>
                  <input
                    value={direccion}
                    onChange={(event) => setDireccion(event.target.value)}
                    className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
                    placeholder="Direccion"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 text-xs text-brand-800">
                    <label className="font-semibold">Contacto emergencia</label>
                    <input
                      value={contactoNombre}
                      onChange={(event) => setContactoNombre(event.target.value)}
                      className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
                      placeholder="Nombre"
                    />
                  </div>
                  <div className="space-y-1 text-xs text-brand-800">
                    <label className="font-semibold">Telefono emergencia</label>
                    <input
                      value={contactoTelefono}
                      onChange={(event) => setContactoTelefono(event.target.value)}
                      className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
                      placeholder="Ej: 0412XXXXXXX"
                    />
                  </div>
                </div>
              </div>
            )}
            {error ? (
              <p className="text-[11px] font-semibold text-brand-900">{error}</p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={saving || loading || !hasChanges}
                className="flex-1 rounded-full bg-brand-700 px-3 py-2 text-xs font-semibold text-paper disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={handleCancelChanges}
                disabled={saving || loading}
                className="flex-1 rounded-full border border-mint px-3 py-2 text-xs font-semibold text-brand-800 disabled:opacity-60"
              >
                Cancelar cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionPage;
