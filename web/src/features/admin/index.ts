export { default as RegistrarEspecialistaPage } from "./pages/RegistrarEspecialistaPage";
export { default as RegistrarModeradorPage } from "./pages/RegistrarModeradorPage";
export { RegistrarEspecialistaForm } from "./components";
export {
	useCrearEspecialistaMutation,
	useCrearModeradorMutation,
	type CrearEspecialistaPayload,
	type CrearModeradorPayload,
} from "./adminApi";
