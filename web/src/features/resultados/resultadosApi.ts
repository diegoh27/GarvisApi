import { baseApi } from "../../app/api/baseApi";

const resultadosApi = baseApi.injectEndpoints({
	endpoints: () => ({}),
	overrideExisting: false,
});

export { resultadosApi };
