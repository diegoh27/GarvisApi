import { baseApi } from "../../app/api/baseApi";

const productosApi = baseApi.injectEndpoints({
	endpoints: () => ({}),
	overrideExisting: false,
});

export { productosApi };
