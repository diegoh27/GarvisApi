import { Link } from "react-router-dom";
import AuthLoginForm from "../components/AuthLoginForm";

const AuthLogin = () => {
	return (
		<div className="min-h-screen bg-[url('/fondo.png')] bg-cover bg-center">
			<div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
				<div className="w-full overflow-hidden rounded-[36px] bg-white shadow-2xl lg:grid lg:grid-cols-[1fr_1.15fr]">
					<div className="relative hidden min-h-[560px] lg:block">
						<div
							className="absolute inset-0 bg-cover bg-center"
							style={{
								backgroundImage: "url('/iniciarsesion%20.png')",
								backgroundPosition: "center 10%",
							}}
						/>
						<div className="absolute inset-0 bg-emerald-900/35" />
						<div className="relative flex h-full flex-col justify-between p-10 text-white">
							<div className="text-sm font-semibold uppercase tracking-widest">
								Logo
							</div>
							<div className="space-y-2">
								<p className="text-sm font-semibold uppercase tracking-[0.2em]">
									Agenda tu ecografía
								</p>
								<p className="text-[32px] font-black leading-tight">
									Rápido y sin esperas
								</p>
							</div>
						</div>
					</div>
					<div className="relative px-8 py-10 sm:px-12">
						<Link
							to="/"
							className="absolute left-8 top-6 text-sm font-semibold text-emerald-700"
						>
							← Regresar al home
						</Link>
						<AuthLoginForm />
					</div>
				</div>
			</div>
		</div>
	);
};

export default AuthLogin;
