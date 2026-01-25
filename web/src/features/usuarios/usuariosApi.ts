import { baseApi } from "../../app/api/baseApi";

const usuariosApi = baseApi.injectEndpoints({
	endpoints: () => ({}),
	overrideExisting: false,
});

export { usuariosApi };
