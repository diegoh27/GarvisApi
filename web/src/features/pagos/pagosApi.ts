import { baseApi } from "../../app/api/baseApi";

const pagosApi = baseApi.injectEndpoints({
	endpoints: () => ({}),
	overrideExisting: false,
});

export { pagosApi };
