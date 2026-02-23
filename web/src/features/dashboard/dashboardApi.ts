import { baseApi } from "../../app/api/baseApi";

const dashboardApi = baseApi.injectEndpoints({
	endpoints: () => ({}),
	overrideExisting: false,
});

export { dashboardApi };
