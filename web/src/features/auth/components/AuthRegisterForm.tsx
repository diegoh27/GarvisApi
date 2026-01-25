import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PasswordField, useAuth } from "../../../shared";

const AuthRegisterForm = () => {
	const navigate = useNavigate();
	const { register, status, error, resetError } = useAuth();
	const [form, setForm] = useState({
		nombre: "",
		apellido: "",
		correo: "",
		genero: "Femenino",
		fecha_nacimiento: "",
		cedula: "",
		telefono: "",
		direccion: "",
		tipo_sangre: "",
		descripcion: "",
		contrasena: "",
	});
	const [localError, setLocalError] = useState("");
	const isLoading = status === "loading";

	const updateField = (field: keyof typeof form, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLocalError("");
		resetError();

		const required = [
			"nombre",
			"apellido",
			"correo",
			"genero",
			"fecha_nacimiento",
			"cedula",
			"telefono",
			"tipo_sangre",
			"descripcion",
			"contrasena",
		];
		const missing = required.filter((field) => !form[field as keyof typeof form]);

		if (missing.length) {
			setLocalError("Completa los campos obligatorios.");
			return;
		}

		try {
			await register({
				nombre: form.nombre,
				apellido: form.apellido,
				correo: form.correo,
				genero: form.genero as "Masculino" | "Femenino" | "Otro",
				fecha_nacimiento: form.fecha_nacimiento,
				cedula: form.cedula,
				telefono: form.telefono,
				tipo_sangre: form.tipo_sangre,
				descripcion: form.descripcion,
				contrasena: form.contrasena,
				direccion: form.direccion || undefined,
			});
			navigate("/auth/login");
		} catch {
			// error ya guardado en store
		}
	};

	return (
		<div className="pt-8">
			<h1 className="text-2xl font-semibold text-emerald-700">Registrarse</h1>
			<form className="mt-6 space-y-4" onSubmit={onSubmit}>
				<input
					type="text"
					placeholder="Nombre"
					className="h-11 w-full rounded-full border border-emerald-200 px-4 text-sm outline-none focus:border-emerald-500"
					value={form.nombre}
					onChange={(event) => updateField("nombre", event.target.value)}
				/>
				<input
					type="text"
					placeholder="Apellido"
					className="h-11 w-full rounded-full border border-emerald-200 px-4 text-sm outline-none focus:border-emerald-500"
					value={form.apellido}
					onChange={(event) => updateField("apellido", event.target.value)}
				/>
				<input
					type="email"
					placeholder="Correo"
					className="h-11 w-full rounded-full border border-emerald-200 px-4 text-sm outline-none focus:border-emerald-500"
					value={form.correo}
					onChange={(event) => updateField("correo", event.target.value)}
				/>
				<div className="grid gap-3 sm:grid-cols-2">
					<input
						type="date"
						placeholder="Fecha de nacimiento"
						className="h-11 w-full rounded-full border border-emerald-200 px-4 text-sm outline-none focus:border-emerald-500"
						value={form.fecha_nacimiento}
						onChange={(event) =>
							updateField("fecha_nacimiento", event.target.value)
						}
					/>
					<select
						className="h-11 w-full rounded-full border border-emerald-200 px-4 text-sm text-slate-500 outline-none focus:border-emerald-500"
						value={form.genero}
						onChange={(event) => updateField("genero", event.target.value)}
					>
						<option>Femenino</option>
						<option>Masculino</option>
						<option>Otro</option>
					</select>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					<input
						type="text"
						placeholder="Cédula de identidad"
						className="h-11 w-full rounded-full border border-emerald-200 px-4 text-sm outline-none focus:border-emerald-500"
						value={form.cedula}
						onChange={(event) => updateField("cedula", event.target.value)}
					/>
					<input
						type="tel"
						placeholder="Teléfono"
						className="h-11 w-full rounded-full border border-emerald-200 px-4 text-sm outline-none focus:border-emerald-500"
						value={form.telefono}
						onChange={(event) => updateField("telefono", event.target.value)}
					/>
				</div>
				<input
					type="text"
					placeholder="Dirección"
					className="h-11 w-full rounded-full border border-emerald-200 px-4 text-sm outline-none focus:border-emerald-500"
					value={form.direccion}
					onChange={(event) => updateField("direccion", event.target.value)}
				/>
				<input
					type="text"
					placeholder="Tipo de sangre"
					className="h-11 w-full rounded-full border border-emerald-200 px-4 text-sm outline-none focus:border-emerald-500"
					value={form.tipo_sangre}
					onChange={(event) => updateField("tipo_sangre", event.target.value)}
				/>
				<textarea
					placeholder="Descripción (padecimientos o notas)"
					className="min-h-[90px] w-full rounded-[24px] border border-emerald-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
					value={form.descripcion}
					onChange={(event) => updateField("descripcion", event.target.value)}
				/>
				<PasswordField
					value={form.contrasena}
					onChange={(value) => updateField("contrasena", value)}
					placeholder="Contraseña"
					className="h-11 w-full rounded-full border border-emerald-200 px-4 pr-10 text-sm outline-none focus:border-emerald-500"
				/>
				{localError ? <p className="text-sm text-rose-500">{localError}</p> : null}
				{error ? <p className="text-sm text-rose-500">{error}</p> : null}
				<button
					className="h-11 w-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 text-sm font-semibold text-white shadow-md transition hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-70"
					disabled={isLoading}
				>
					{isLoading ? "Registrando..." : "Regístrate"}
				</button>
				<p className="text-sm text-slate-500">
					¿Ya tienes una cuenta?{" "}
					<Link to="/auth/login" className="font-semibold text-emerald-700">
						Inicia sesión aquí
					</Link>
					.
				</p>
			</form>
		</div>
	);
};

export default AuthRegisterForm;
