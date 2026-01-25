import { Link } from "react-router-dom";
import AuthForgotForm from "../components/AuthForgotForm";

const AuthForgot = () => {
	return (
		<div className="min-h-screen bg-[url('/fondo.png')] bg-cover bg-center">
			<div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
				<div className="w-full overflow-hidden rounded-[36px] bg-white shadow-2xl lg:grid lg:grid-cols-[0.95fr_1.05fr]">
					<div className="relative hidden min-h-[560px] lg:block">
						<div
							className="absolute inset-0 bg-cover bg-center"
							style={{
								backgroundImage: "url('/olvidecontrasena.png')",
								backgroundPosition: "center 15%",
							}}
						/>
						<div className="absolute inset-0 bg-emerald-900/30" />
					</div>
					<div className="relative flex flex-col justify-center px-8 py-10 sm:px-12">
						<Link
							to="/auth/login"
							className="absolute left-8 top-6 text-sm font-semibold text-emerald-700"
						>
							← Regresar al inicio de sesión
						</Link>
						<AuthForgotForm />
					</div>
				</div>
			</div>
		</div>
	);
};

export default AuthForgot;
