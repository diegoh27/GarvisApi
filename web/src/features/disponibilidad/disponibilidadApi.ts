import { baseApi } from "../../app/api/baseApi";

type DisponibilidadPublicaParams = {
	fecha?: string;
};

const disponibilidadApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getDisponibilidadPublica: builder.query<unknown, DisponibilidadPublicaParams | void>({
			query: (params) => ({
				url: "/disponibilidad/publica",
				params: params ?? undefined,
			}),
		}),
	}),
	overrideExisting: false,
});

const { useGetDisponibilidadPublicaQuery } = disponibilidadApi;

export { disponibilidadApi, useGetDisponibilidadPublicaQuery };
