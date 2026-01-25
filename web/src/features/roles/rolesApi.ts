import { baseApi } from "../../app/api/baseApi";

const rolesApi = baseApi.injectEndpoints({
	endpoints: () => ({}),
	overrideExisting: false,
});

export { rolesApi };
