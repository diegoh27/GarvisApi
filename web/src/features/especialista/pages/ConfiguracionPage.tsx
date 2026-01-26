import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { PasswordField, useAuth } from "../../../shared";
import { apiClient } from "../../../services/apiClient";

type PerfilData = {
	nombre?: string;
	apellido?: string;
	correo?: string;
	cedula?: string;
	telefono?: string;
	rol?: string;
	especialidad?: string;
};

const ConfiguracionPage = () => {
	const { user, token } = useAuth();
	const [perfil, setPerfil] = useState<PerfilData | null>(null);
	const [telefono, setTelefono] = useState("");
	const [contrasena, setContrasena] = useState("");
	const [confirmar, setConfirmar] = useState("");
	const [editTelefono, setEditTelefono] = useState(false);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isEspecialista = user?.rol === "especialista";
	const isPaciente = user?.rol === "paciente";
	const isModerador = user?.rol === "moderador";

	const fetchPerfil = useCallback(async () => {
		if (!token) return;
		if (!isPaciente && !isEspecialista && !isModerador) return;
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
			}
			const response = await apiClient.get<{ ok: boolean; data: PerfilData }>(
				endpoint,
			);
			const data = response.data;
			setPerfil(data);
			setTelefono(data?.telefono ?? "");
			setEditTelefono(false);
		} catch (err) {
			setError((err as Error).message ?? "No se pudo cargar el perfil");
		} finally {
			setLoading(false);
		}
	}, [isEspecialista, isPaciente, isModerador, token]);

	useEffect(() => {
		fetchPerfil();
	}, [fetchPerfil]);

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);

		if (!isPaciente && !isEspecialista && !isModerador) {
			setError("Esta sección está disponible para pacientes, especialistas y moderadores.");
			return;
		}

		if (contrasena && contrasena !== confirmar) {
			setError("Las contraseñas no coinciden.");
			return;
		}

		const payload: { telefono?: string; contrasena?: string } = {};
		if (editTelefono && telefono && telefono !== perfil?.telefono) {
			payload.telefono = telefono;
		}
		if (contrasena) {
			payload.contrasena = contrasena;
		}

		if (!payload.telefono && !payload.contrasena) {
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
			editTelefono && telefono && telefono !== perfil?.telefono;
		const passwordChanged = !!contrasena;
		return telefonoChanged || passwordChanged;
	}, [contrasena, editTelefono, perfil?.telefono, telefono]);

	const handleCancelChanges = () => {
		setTelefono(perfil?.telefono ?? "");
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
							<div className="space-y-1 text-xs text-brand-800">
								<label className="font-semibold">Rol</label>
								<input
									value={user?.rol ?? ""}
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
						Puedes editar solo teléfono y contraseña.
					</p>

					<form className="mt-4 space-y-4" onSubmit={handleSubmit}>
						<div className="space-y-2 text-xs text-brand-800">
							<div className="flex items-center justify-between">
								<label className="font-semibold">Teléfono</label>
								<button
									type="button"
									onClick={() => setEditTelefono((prev) => !prev)}
									className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800"
								>
									{editTelefono ? "Cancelar edición" : "Editar"}
								</button>
							</div>
							{editTelefono ? (
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
