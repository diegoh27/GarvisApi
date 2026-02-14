import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./useStore";
import {
	clearAuth,
	clearError,
	setError,
	setStatus,
	setToken,
	setUser,
} from "../../features/auth/authSlice";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import {
	useForgotPasswordMutation,
	useLoginMutation,
	useRegisterMutation,
} from "../../features/auth";
import type { LoginPayload, LoginResponse, RegisterPayload } from "../types/auth";

type ApiErrorShape = {
	message?: string;
};

const getErrorMessage = (err: unknown) => {
	if (err && typeof err === "object" && "data" in err) {
		const data = (err as FetchBaseQueryError).data as ApiErrorShape | undefined;
		if (data?.message) {
			return data.message;
		}
	}
	if (err && typeof err === "object" && "message" in err) {
		return String((err as { message?: string }).message ?? "Error inesperado");
	}
	return "Error inesperado";
};

const useAuth = () => {
	const dispatch = useAppDispatch();
	const { token, user, status, error } = useAppSelector((state) => state.auth);
	const [loginMutation] = useLoginMutation();
	const [registerMutation] = useRegisterMutation();
	const [forgotPasswordMutation] = useForgotPasswordMutation();

	const login = useCallback(
		async (payload: LoginPayload): Promise<LoginResponse> => {
			dispatch(setStatus("loading"));
			dispatch(clearError());
			try {
				const response = await loginMutation(payload).unwrap();
				dispatch(setToken(response.token));
				dispatch(setUser(response.user));
				dispatch(setStatus("succeeded"));
				return response;
			} catch (err) {
				dispatch(setStatus("failed"));
				dispatch(setError(getErrorMessage(err)));
				throw err;
			}
		},
		[dispatch, loginMutation],
	);

	const register = useCallback(
		async (payload: RegisterPayload) => {
			dispatch(setStatus("loading"));
			dispatch(clearError());
			try {
				const response = await registerMutation(payload).unwrap();
				dispatch(setStatus("succeeded"));
				return response;
			} catch (err) {
				dispatch(setStatus("failed"));
				dispatch(setError(getErrorMessage(err)));
				throw err;
			}
		},
		[dispatch, registerMutation],
	);

	const logout = useCallback(() => {
		dispatch(clearAuth());
	}, [dispatch]);

	const resetError = useCallback(() => {
		dispatch(clearError());
	}, [dispatch]);

	const forgotPassword = useCallback(
		async (correo: string) => {
			try {
				const response = await forgotPasswordMutation({ correo }).unwrap();
				return { ok: response.ok, message: response.message };
			} catch (err) {
				return {
					ok: false,
					message: getErrorMessage(err),
				};
			}
		},
		[forgotPasswordMutation],
	);

	return {
		token,
		user,
		status,
		error,
		login,
		register,
		logout,
		resetError,
		forgotPassword,
	};
};

export { useAuth };
