import { baseApi } from "../../app/api/baseApi";

const empleadosApi = baseApi.injectEndpoints({
	endpoints: () => ({}),
	overrideExisting: false,
});

export { empleadosApi };
