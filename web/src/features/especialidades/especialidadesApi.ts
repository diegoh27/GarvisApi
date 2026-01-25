import { baseApi } from "../../app/api/baseApi";

const especialidadesApi = baseApi.injectEndpoints({
	endpoints: () => ({}),
	overrideExisting: false,
});

export { especialidadesApi };
