import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import { AuthForgot, AuthLogin, AuthRegister, AuthReset } from "../features/auth";
import { CitasPage } from "../features/citas";
import { DashboardPage } from "../features/dashboard";
import {
	DisponibilidadPublicaPage,
	DisponibilidadPendientesPage,
} from "../features/disponibilidad";
import { EcosPage } from "../features/ecos";

import { EspecialidadesPage } from "../features/especialidades";
import {
	CalendarioPage,
	InformesPage,
	PacientesPage,
} from "../features/especialista";
import { NotificacionesPage } from "../features/notificaciones";
import {
	EspecialistaDetallePage,
	EspecialistasListPage,
} from "../features/especialistas";
import { CalendarioModeradorPage, PacientesPage as ModeradoresPacientesPage, TodasLasCitasPage } from "../features/moderadores";
import {
	RegistrarEspecialistaPage,
	RegistrarModeradorPage,
	MetodosPagoPage,
} from "../features/admin";
import { HomePage } from "../features/home";
import { InventarioPage } from "../features/inventario";
import { ModeradoresPage } from "../features/moderadores";
import { NotFoundPage } from "../features/notfound";
import { PagosPage } from "../features/pagos";

import { RepresentadosPage } from "../features/representados";
import { ResultadosPage } from "../features/resultados";
import { RolesPage } from "../features/roles";
import { UsuariosPage } from "../features/usuarios";
import { ConfiguracionPage } from "../features/configuracion";
import AuditoriaPage from "../features/auditoria/AuditoriaPage";
import GuestRoute from "../routes/GuestRoute";
import ProtectedRoute from "../routes/ProtectedRoute";
import RoleRoute from "../routes/RoleRoute";

const App = () => {
	return (
		<BrowserRouter>
			<Routes>
				<Route element={<AppLayout />}>
					<Route
						index
						element={
							<GuestRoute>
								<HomePage />
							</GuestRoute>
						}
					/>
					<Route
						path="auth/login"
						element={
							<GuestRoute>
								<AuthLogin />
							</GuestRoute>
						}
					/>
					<Route
						path="auth/forgot"
						element={
							<GuestRoute>
								<AuthForgot />
							</GuestRoute>
						}
					/>
					<Route
						path="auth/register"
						element={
							<GuestRoute>
								<AuthRegister />
							</GuestRoute>
						}
					/>
					<Route
						path="auth/reset"
						element={
							<GuestRoute>
								<AuthReset />
							</GuestRoute>
						}
					/>
					<Route
						path="dashboard"
						element={
							<ProtectedRoute>
								<DashboardPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="calendario"
						element={
							<ProtectedRoute>
								<RoleRoute allowed={["especialista"]}>
									<CalendarioPage />
								</RoleRoute>
							</ProtectedRoute>
						}
					/>
					<Route
						path="calendario-moderador"
						element={
							<ProtectedRoute>
								<RoleRoute allowed={["moderador", "admin"]}>
									<CalendarioModeradorPage />
								</RoleRoute>
							</ProtectedRoute>
						}
					/>
					<Route
						path="especialistas"
						element={
							<RoleRoute allowed={["paciente", "admin", "moderador"]}>
								<EspecialistasListPage />
							</RoleRoute>
						}
					/>
					<Route
						path="admin/registrar-especialista"
						element={
							<RoleRoute allowed={["admin"]}>
								<RegistrarEspecialistaPage />
							</RoleRoute>
						}
					/>
					<Route
						path="admin/registrar-moderador"
						element={
							<RoleRoute allowed={["admin"]}>
								<RegistrarModeradorPage />
							</RoleRoute>
						}
					/>
					<Route
						path="admin/metodos-pago"
						element={
							<RoleRoute allowed={["admin"]}>
								<MetodosPagoPage />
							</RoleRoute>
						}
					/>
					<Route
						path="especialistas/:id"
						element={
							<RoleRoute allowed={["paciente", "admin", "moderador"]}>
								<EspecialistaDetallePage />
							</RoleRoute>
						}
					/>
					<Route
						path="disponibilidad"
						element={
							<RoleRoute allowed={["paciente", "admin", "moderador"]}>
								<DisponibilidadPublicaPage />
							</RoleRoute>
						}
					/>
					<Route
						path="disponibilidad/pendientes"
						element={
							<RoleRoute allowed={["admin", "moderador"]}>
								<DisponibilidadPendientesPage />
							</RoleRoute>
						}
					/>
					{/* Ruta de pacientes para moderadores y admin */}
					<Route
						path="pacientes"
						element={
							<RoleRoute allowed={["admin", "moderador"]}>
								<ModeradoresPacientesPage />
							</RoleRoute>
						}
					/>
					{/* Ruta de pacientes para especialistas */}
					<Route
						path="pacientes-especialista"
						element={
							<RoleRoute allowed={["especialista"]}>
								<PacientesPage />
							</RoleRoute>
						}
					/>
					<Route
						path="moderadores"
						element={
							<RoleRoute allowed={["admin"]}>
								<ModeradoresPage />
							</RoleRoute>
						}
					/>
					<Route
						path="especialidades"
						element={
							<RoleRoute allowed={["admin"]}>
								<EspecialidadesPage />
							</RoleRoute>
						}
					/>
					<Route
						path="ecos"
						element={
							<RoleRoute allowed={["admin"]}>
								<EcosPage />
							</RoleRoute>
						}
					/>
					<Route
						path="informes"
						element={
							<RoleRoute allowed={["admin", "moderador", "especialista"]}>
								<InformesPage />
							</RoleRoute>
						}
					/>
					<Route
						path="citas"
						element={
							<ProtectedRoute>
								<RoleRoute allowed={["paciente"]}>
									<CitasPage />
								</RoleRoute>
							</ProtectedRoute>
						}
					/>
					<Route
						path="representados"
						element={
							<ProtectedRoute>
								<RoleRoute allowed={["paciente"]}>
									<RepresentadosPage />
								</RoleRoute>
							</ProtectedRoute>
						}
					/>
					<Route
						path="resultados"
						element={
							<RoleRoute allowed={["admin", "moderador", "especialista"]}>
								<ResultadosPage />
							</RoleRoute>
						}
					/>
					<Route
						path="notificaciones"
						element={
							<ProtectedRoute>
								<NotificacionesPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="pagos"
						element={
							<RoleRoute allowed={["admin", "moderador"]}>
								<PagosPage />
							</RoleRoute>
						}
					/>
					<Route
						path="todas-las-citas"
						element={
							<RoleRoute allowed={["admin", "moderador"]}>
								<TodasLasCitasPage />
							</RoleRoute>
						}
					/>
					<Route
						path="inventario"
						element={
							<RoleRoute allowed={["admin", "moderador"]}>
								<InventarioPage />
							</RoleRoute>
						}
					/>

					<Route
						path="usuarios"
						element={
							<RoleRoute allowed={["admin"]}>
								<UsuariosPage />
							</RoleRoute>
						}
					/>
					<Route
						path="roles"
						element={
							<RoleRoute allowed={["admin"]}>
								<RolesPage />
							</RoleRoute>
						}
					/>
				<Route
					path="configuracion"
					element={
						<ProtectedRoute>
							<ConfiguracionPage />
						</ProtectedRoute>
					}
				/>
				<Route
					path="auditoria"
					element={
						<RoleRoute allowed={["admin", "moderador"]}>
							<AuditoriaPage />
						</RoleRoute>
					}
				/>
				<Route path="*" element={<NotFoundPage />} />
				</Route>
			</Routes>
		</BrowserRouter>
	);
};

export default App;
