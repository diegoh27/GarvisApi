import { baseApi } from "../../app/api/baseApi";
import type {
	LoginPayload,
	LoginResponse,
	RegisterPayload,
	RegisterResponse,
} from "../../shared/types/auth";

const authApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		login: builder.mutation<LoginResponse, LoginPayload>({
			query: (body) => ({
				url: "/auth/login",
				method: "POST",
				body,
			}),
		}),
		register: builder.mutation<RegisterResponse, RegisterPayload>({
			query: (body) => ({
				url: "/auth/register",
				method: "POST",
				body,
			}),
		}),
		forgotPassword: builder.mutation<{ ok: boolean; message: string }, { correo: string }>(
			{
				query: (body) => ({
					url: "/auth/forgot",
					method: "POST",
					body,
				}),
			},
		),
	}),
});

const { useLoginMutation, useRegisterMutation, useForgotPasswordMutation } = authApi;

export { authApi, useLoginMutation, useRegisterMutation, useForgotPasswordMutation };
