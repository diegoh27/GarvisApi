import { type FormEvent, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import {
	EmailVerificationBanner,
	PasswordField,
	useAuth,
	CedulaField,
	parseCedulaDisplay,
	TelefonoField,
	validarNumeroTelefono,
	MENSAJE_TELEFONO_REQUERIDO,
	MENSAJE_TELEFONO_7_DIGITOS,
	parseTelefonoDisplay,
	validarRangoCedula,
	MENSAJE_RANGO_CEDULA,
} from "../../../shared";
import {
	type PerfilData,
	type PerfilRol,
	useGetPerfilQuery,
	useUpdatePerfilMutation,
} from "../configuracionApi";

const PERFIL_ROLES: PerfilRol[] = ["paciente", "especialista", "moderador", "admin"];

const TIPOS_SANGRE = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

const ConfiguracionPage = () => {
	const { user, token } = useAuth();
	const perfilRol: PerfilRol | null =
		user?.rol && PERFIL_ROLES.includes(user.rol as PerfilRol)
			? (user.rol as PerfilRol)
			: null;

	const { data: perfil = null, isLoading: loading, isError: queryError, error: queryErrorData } = useGetPerfilQuery(
		perfilRol ?? "paciente",
		{ skip: !token || !perfilRol },
	);
	const [updatePerfil, { isPending: saving }] = useUpdatePerfilMutation();

	const [nombre, setNombre] = useState("");
	const [apellido, setApellido] = useState("");
	const [genero, setGenero] = useState("");
	const [correo, setCorreo] = useState("");
	const [tipoCedula, setTipoCedula] = useState<"V" | "E" | "J" | "P" | "G">("V");
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
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const clearFieldError = (field: string) => {
		setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
	};

	const isEspecialista = user?.rol === "especialista";
	const isPaciente = user?.rol === "paciente";
	const isModerador = user?.rol === "moderador";
	const isAdmin = user?.rol === "admin";

	// Sincronizar formulario con datos del perfil (carga inicial y tras actualizar)
	useEffect(() => {
		if (!perfil) return;
		setNombre(perfil.nombre ?? "");
		setApellido(perfil.apellido ?? "");
		setGenero(perfil.genero ?? "");
		setCorreo(perfil.correo ?? "");
		const parsed = parseCedulaDisplay(perfil.cedula);
		setTipoCedula(parsed.tipo);
		setCedula(parsed.numero);
		setFechaNacimiento(perfil.fecha_nacimiento?.slice(0, 10) ?? "");
		setTelefono(perfil.telefono ?? "");
		setTipoSangre(perfil.tipo_sangre ?? "");
		setDescripcion(perfil.descripcion ?? "");
		setDireccion(perfil.direccion ?? "");
		setContactoNombre(perfil.contacto_emergencia_nombre ?? "");
		setContactoTelefono(perfil.contacto_emergencia_telefono ?? "");
		setEditTelefono(false);
	}, [perfil]);

	// Mostrar error de carga
	useEffect(() => {
		if (queryError && queryErrorData) {
			const msg =
				(queryErrorData as { data?: { message?: string }; message?: string })
					?.data?.message ??
				(queryErrorData as Error).message ??
				"No se pudo cargar el perfil";
			setError(msg);
		} else if (perfil !== undefined) {
			setError(null);
		}
	}, [queryError, queryErrorData, perfil]);

  const validateForm = (): Record<string, string> => {
    const err: Record<string, string> = {};
    const req = "Este campo no puede estar vacío.";

    if (isAdmin) {
      if (!nombre.trim()) err.nombre = req;
      if (!apellido.trim()) err.apellido = req;
      if (!genero.trim()) err.genero = req;
      if (!cedula.trim()) err.cedula = "La cédula es requerida.";
      else if (!validarRangoCedula(cedula)) err.cedula = MENSAJE_RANGO_CEDULA;
      if (!correo.trim()) err.correo = req;
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) err.correo = "Correo electrónico inválido.";
      if (!fechaNacimiento.trim()) err.fecha_nacimiento = req;
      else if (new Date(fechaNacimiento).getTime() > new Date().getTime()) err.fecha_nacimiento = "La fecha de nacimiento no puede ser futura.";
    }

    const allowPhoneEdit = isAdmin || editTelefono;
    if (allowPhoneEdit) {
      const { number: numTel } = parseTelefonoDisplay(telefono);
      if (!telefono.trim()) err.telefono = MENSAJE_TELEFONO_REQUERIDO;
      else if (!validarNumeroTelefono(numTel)) err.telefono = MENSAJE_TELEFONO_7_DIGITOS;
    }

    if (isPaciente) {
      if (!tipoSangre.trim()) err.tipo_sangre = req;
      else if (!TIPOS_SANGRE.includes(tipoSangre as (typeof TIPOS_SANGRE)[number])) err.tipo_sangre = "Selecciona un tipo de sangre válido.";
      if (!descripcion.trim()) err.descripcion = req;
      if (!direccion.trim()) err.direccion = req;
      if (!contactoNombre.trim()) err.contacto_emergencia_nombre = req;
      const { number: numContacto } = parseTelefonoDisplay(contactoTelefono);
      if (!contactoTelefono.trim()) err.contacto_emergencia_telefono = req;
      else if (!validarNumeroTelefono(numContacto)) err.contacto_emergencia_telefono = MENSAJE_TELEFONO_7_DIGITOS;
    }

    return err;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

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

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(Object.values(errors)[0] ?? "Revisa los campos marcados.");
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
      const cedulaActual = parseCedulaDisplay(perfil?.cedula);
      const cedulaCompleta = `${tipoCedula}${cedula}`;
      if (cedulaCompleta !== (cedulaActual.tipo + cedulaActual.numero)) {
        payload.cedula = cedulaCompleta;
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

    if (!perfilRol) return;

    try {
      await updatePerfil({ rol: perfilRol, payload }).unwrap();
      setContrasena("");
      setConfirmar("");
      await Swal.fire({
        title: "Cambios guardados",
        text: "Tu información se actualizó correctamente.",
        icon: "success",
        confirmButtonText: "Listo",
        confirmButtonColor: "#1C837F",
      });
    } catch (err) {
      setError((err as Error).message ?? "No se pudo guardar");
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
        `${tipoCedula}${cedula}` !== (parseCedulaDisplay(perfil?.cedula).tipo + parseCedulaDisplay(perfil?.cedula).numero) ||
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
    const parsed = parseCedulaDisplay(perfil?.cedula);
    setTipoCedula(parsed.tipo);
    setCedula(parsed.numero);
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
    setFieldErrors({});
  };

  return (
    <div className="space-y-6">
      <EmailVerificationBanner />
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
                      onChange={(event) => {
                        clearFieldError("nombre");
                        setNombre(event.target.value);
                      }}
                      className={`w-full rounded-xl border bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700 ${fieldErrors.nombre ? "border-red-500" : "border-mist"}`}
                    />
                    {fieldErrors.nombre && <p className="mt-1 text-xs text-red-500">{fieldErrors.nombre}</p>}
                  </div>
                  <div className="space-y-1 text-xs text-brand-800">
                    <label className="font-semibold">Apellido</label>
                    <input
                      value={apellido}
                      onChange={(event) => {
                        clearFieldError("apellido");
                        setApellido(event.target.value);
                      }}
                      className={`w-full rounded-xl border bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700 ${fieldErrors.apellido ? "border-red-500" : "border-mist"}`}
                    />
                    {fieldErrors.apellido && <p className="mt-1 text-xs text-red-500">{fieldErrors.apellido}</p>}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 text-xs text-brand-800">
                    <CedulaField
                      label={<span className="font-semibold">Cédula</span>}
                      value={`${tipoCedula}${cedula}`}
                      onChange={(tipo, numero) => {
                        clearFieldError("cedula");
                        setTipoCedula(tipo);
                        setCedula(numero);
                      }}
                      error={fieldErrors.cedula}
                      inputClassName="rounded-xl border-mist bg-paper py-2 text-xs focus:border-brand-700"
                      selectClassName="rounded-xl border-mist bg-paper py-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1 text-xs text-brand-800">
                    <label className="font-semibold">Correo</label>
                    <input
                      value={correo}
                      onChange={(event) => {
                        clearFieldError("correo");
                        setCorreo(event.target.value);
                      }}
                      className={`w-full rounded-xl border bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700 ${fieldErrors.correo ? "border-red-500" : "border-mist"}`}
                    />
                    {fieldErrors.correo && <p className="mt-1 text-xs text-red-500">{fieldErrors.correo}</p>}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 text-xs text-brand-800">
                    <label className="font-semibold">Género</label>
                    <select
                      value={genero}
                      onChange={(event) => {
                        clearFieldError("genero");
                        setGenero(event.target.value);
                      }}
                      className={`w-full rounded-xl border bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700 ${fieldErrors.genero ? "border-red-500" : "border-mist"}`}
                    >
                      <option value="">Selecciona</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </select>
                    {fieldErrors.genero && <p className="mt-1 text-xs text-red-500">{fieldErrors.genero}</p>}
                  </div>
                  <div className="space-y-1 text-xs text-brand-800">
                    <label className="font-semibold">Fecha nacimiento</label>
                    <input
                      type="date"
                      value={fechaNacimiento}
                      onChange={(event) => {
                        clearFieldError("fecha_nacimiento");
                        setFechaNacimiento(event.target.value);
                      }}
                      className={`w-full rounded-xl border bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700 ${fieldErrors.fecha_nacimiento ? "border-red-500" : "border-mist"}`}
                    />
                    {fieldErrors.fecha_nacimiento && <p className="mt-1 text-xs text-red-500">{fieldErrors.fecha_nacimiento}</p>}
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
                <TelefonoField
                  value={telefono}
                  onChange={(prefijo, numero) => {
                    clearFieldError("telefono");
                    setTelefono(prefijo + numero);
                  }}
                  label={null}
                  error={fieldErrors.telefono}
                  inputClassName="rounded-xl border-mist bg-paper py-2 text-xs focus:border-brand-700"
                  selectClassName="rounded-xl border-mist bg-paper py-2 text-xs"
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
                  <select
                    value={tipoSangre}
                    onChange={(event) => {
                      clearFieldError("tipo_sangre");
                      setTipoSangre(event.target.value);
                    }}
                    className={`w-full rounded-xl border bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700 ${fieldErrors.tipo_sangre ? "border-red-500" : "border-mist"}`}
                  >
                    <option value="">Selecciona tipo de sangre</option>
                    {TIPOS_SANGRE.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.tipo_sangre && <p className="mt-1 text-xs text-red-500">{fieldErrors.tipo_sangre}</p>}
                </div>
                <div className="space-y-1 text-xs text-brand-800">
                  <label className="font-semibold">Descripción</label>
                  <textarea
                    value={descripcion}
                    onChange={(event) => {
                      clearFieldError("descripcion");
                      setDescripcion(event.target.value);
                    }}
                    className={`w-full rounded-xl border bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700 ${fieldErrors.descripcion ? "border-red-500" : "border-mist"}`}
                    rows={3}
                    placeholder="Notas o condiciones relevantes"
                  />
                  {fieldErrors.descripcion && <p className="mt-1 text-xs text-red-500">{fieldErrors.descripcion}</p>}
                </div>
                <div className="space-y-1 text-xs text-brand-800">
                  <label className="font-semibold">Dirección</label>
                  <input
                    value={direccion}
                    onChange={(event) => {
                      clearFieldError("direccion");
                      setDireccion(event.target.value);
                    }}
                    className={`w-full rounded-xl border bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700 ${fieldErrors.direccion ? "border-red-500" : "border-mist"}`}
                    placeholder="Dirección"
                  />
                  {fieldErrors.direccion && <p className="mt-1 text-xs text-red-500">{fieldErrors.direccion}</p>}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="min-w-0 space-y-1 text-xs text-brand-800">
                    <label className="font-semibold">Contacto emergencia (nombre)</label>
                    <input
                      value={contactoNombre}
                      onChange={(event) => {
                        clearFieldError("contacto_emergencia_nombre");
                        setContactoNombre(event.target.value);
                      }}
                      className={`w-full rounded-xl border bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700 ${fieldErrors.contacto_emergencia_nombre ? "border-red-500" : "border-mist"}`}
                      placeholder="Nombre"
                    />
                    {fieldErrors.contacto_emergencia_nombre && <p className="mt-1 text-xs text-red-500">{fieldErrors.contacto_emergencia_nombre}</p>}
                  </div>
                  <div className="min-w-0 space-y-1 text-xs text-brand-800">
                    <TelefonoField
                      label={<span className="font-semibold">Teléfono emergencia</span>}
                      value={contactoTelefono}
                      onChange={(prefijo, numero) => {
                        clearFieldError("contacto_emergencia_telefono");
                        setContactoTelefono(prefijo + numero);
                      }}
                      error={fieldErrors.contacto_emergencia_telefono}
                      required
                      inputClassName="rounded-xl border-mist bg-paper py-2 text-xs focus:border-brand-700"
                      selectClassName="rounded-xl border-mist bg-paper py-2 text-xs"
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
