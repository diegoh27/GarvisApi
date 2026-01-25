import { baseApi } from "../../app/api/baseApi";

const citasApi = baseApi.injectEndpoints({
	endpoints: () => ({}),
	overrideExisting: false,
});

export { citasApi };
