import { baseApi } from "../../app/api/baseApi";

const inventarioApi = baseApi.injectEndpoints({
	endpoints: () => ({}),
	overrideExisting: false,
});

export { inventarioApi };
