import { baseApi } from "../../app/api/baseApi";

const moderadoresApi = baseApi.injectEndpoints({
	endpoints: () => ({}),
	overrideExisting: false,
});

export { moderadoresApi };
