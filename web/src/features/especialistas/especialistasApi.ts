import { baseApi } from "../../app/api/baseApi";

const especialistasApi = baseApi.injectEndpoints({
	endpoints: () => ({}),
	overrideExisting: false,
});

export { especialistasApi };
