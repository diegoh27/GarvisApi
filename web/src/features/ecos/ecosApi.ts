import { baseApi } from "../../app/api/baseApi";

const ecosApi = baseApi.injectEndpoints({
	endpoints: () => ({}),
	overrideExisting: false,
});

export { ecosApi };
