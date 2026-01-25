import { baseApi } from "../../app/api/baseApi";

const homeApi = baseApi.injectEndpoints({
	endpoints: () => ({}),
	overrideExisting: false,
});

export { homeApi };
