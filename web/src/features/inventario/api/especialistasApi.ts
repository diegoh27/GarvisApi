import { baseApi } from "../../../app/api/baseApi";

type EspecialistaInventario = {
  id_especialista: string;
  nombre: string;
  apellido: string;
  id_especialidad: string;
  especialidad: string;
  porcentaje: number | null;
};

const especialistasApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEspecialistasInventario: builder.query<
      EspecialistaInventario[],
      { q?: string } | void
    >({
      query: (params) => ({
        url: "/medicos",
        params: params ?? undefined,
      }),
      transformResponse: (response: {
        ok: boolean;
        data: EspecialistaInventario[];
      }) => response.data ?? [],
      providesTags: ["Usuarios"],
    }),
  }),
});

export const { useGetEspecialistasInventarioQuery } = especialistasApi;
export type { EspecialistaInventario };
