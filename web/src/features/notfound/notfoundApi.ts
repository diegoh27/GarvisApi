import { baseApi } from "../../app/api/baseApi";

const notfoundApi = baseApi.injectEndpoints({
	endpoints: () => ({}),
	overrideExisting: false,
});

export { notfoundApi };
