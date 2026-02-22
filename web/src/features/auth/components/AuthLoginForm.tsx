import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getHomeByRole, PasswordField, useAuth } from "../../../shared";

type BannerType = { type: "success"; message: string } | { type: "error"; message: string };

const AuthLoginForm = () => {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const { login, status, error, resetError, token, user } = useAuth();
	const [banner, setBanner] = useState<BannerType | null>(null);
	const [correo, setCorreo] = useState("");
	const [contrasena, setContrasena] = useState("");
	const [localError, setLocalError] = useState("");
	const [lockoutSecs, setLockoutSecs] = useState(0);
	const lockoutInterval = useRef<ReturnType<typeof setInterval> | null>(null);
	const wasLockedRef = useRef(false);
	const isLoading = status === "loading";
	const isLocked = lockoutSecs > 0;

	useEffect(() => {
		return () => {
			if (lockoutInterval.current) clearInterval(lockoutInterval.current);
		};
	}, []);

	// Limpia el error del store cuando el timeout termina
	useEffect(() => {
		if (wasLockedRef.current && !isLocked) {
			resetError();
		}
		wasLockedRef.current = isLocked;
	}, [isLocked, resetError]);

	const startLockoutCountdown = (secs: number) => {
		if (lockoutInterval.current) clearInterval(lockoutInterval.current);
		setLockoutSecs(secs);
		lockoutInterval.current = setInterval(() => {
			setLockoutSecs((prev) => {
				if (prev <= 1) {
					clearInterval(lockoutInterval.current!);
					lockoutInterval.current = null;
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	};

	useEffect(() => {
		const verified = searchParams.get("verified");
		const passwordReset = searchParams.get("passwordReset");
		const sessionExpired = searchParams.get("session_expired");
		const err = searchParams.get("error");
		if (verified === "1") {
			setBanner({
				type: "success",
				message: "¡Correo verificado! Tu cuenta ya está activa. Inicia sesión para continuar.",
			});
			setSearchParams({}, { replace: true });
		} else if (passwordReset === "1") {
			setBanner({
				type: "success",
				message: "¡Contraseña actualizada! Ya puedes iniciar sesión con tu nueva contraseña.",
			});
			setSearchParams({}, { replace: true });
		} else if (sessionExpired === "1") {
			setBanner({
				type: "error",
				message: "Tu sesión ya no es válida. Inicia sesión de nuevo.",
			});
			setSearchParams({}, { replace: true });
		} else if (verified === "0" || passwordReset === "0" || err) {
			setBanner({
				type: "error",
				message: err ? decodeURIComponent(err) : "Token inválido o expirado",
			});
			setSearchParams({}, { replace: true });
		}
	}, [searchParams, setSearchParams]);

	useEffect(() => {
		if (token && user?.rol) {
			navigate(getHomeByRole(user.rol), { replace: true });
		}
	}, [navigate, token, user]);

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLocalError("");
		resetError();

		if (isLocked) return;

		if (!correo || !contrasena) {
			setLocalError("Completa correo y contraseña.");
			return;
		}

		try {
			const result = await login({ correo, contrasena });
			navigate(getHomeByRole(result.user?.rol), { replace: true });
		} catch (err: unknown) {
			const apiErr = err as { status?: number; data?: { retryAfterSecs?: number } };
			const retrySecs = apiErr?.data?.retryAfterSecs;
			if (retrySecs && retrySecs > 0) {
				startLockoutCountdown(retrySecs);
			}
		}
	};

	return (
		<div className="pt-8">
			<h1 className="text-2xl font-semibold text-emerald-700">
				Iniciar sesión
			</h1>
			{banner?.type === "success" && (
				<div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
					{banner.message}
				</div>
			)}
			{banner?.type === "error" && (
				<div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
					<span className="font-semibold">Error:</span> {banner.message}
				</div>
			)}
			{/* Botón de Google comentado temporalmente
			<button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
				<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
					G
				</span>
				Iniciar sesión con Google
			</button>
			*/}
			<p className="mt-4 text-sm text-slate-500">
				Si no posees una cuenta regístrate{" "}
				<Link to="/auth/register" className="font-semibold text-emerald-700">
					aquí
				</Link>
				.
			</p>
			<form className="mt-6 space-y-4" onSubmit={onSubmit}>
				<input
					type="email"
					placeholder="Correo electrónico"
					className="h-11 w-full rounded-full border border-emerald-200 px-4 text-sm outline-none focus:border-emerald-500"
					value={correo}
					onChange={(event) => setCorreo(event.target.value)}
				/>
				<PasswordField
					value={contrasena}
					onChange={setContrasena}
					placeholder="Contraseña"
					className="h-11 w-full rounded-full border border-emerald-200 px-4 pr-10 text-sm outline-none focus:border-emerald-500"
				/>
				{localError ? (
					<p className="text-sm text-rose-500">{localError}</p>
				) : null}
				{error && !isLocked ? <p className="text-sm text-rose-500">{error}</p> : null}
				{isLocked && (
					<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
						Demasiados intentos fallidos. Podrás intentarlo de nuevo en{" "}
						<span className="font-bold">{lockoutSecs}s</span>.
					</div>
				)}
				<button
					className="h-11 w-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 text-sm font-semibold text-white shadow-md transition hover:from-emerald-500 hover:to-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={isLoading || isLocked}
				>
					{isLoading ? "Ingresando..." : isLocked ? `Bloqueado (${lockoutSecs}s)` : "Iniciar sesión"}
				</button>
				<Link to="/auth/forgot" className="text-sm font-semibold text-emerald-700">
					Olvidé mi contraseña
				</Link>
			</form>
		</div>
	);
};

export default AuthLoginForm;
