import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import {
	clearToken,
	getToken,
	parseToken,
	saveToken,
} from "../../shared/utils/token";
import {
	clearStoredUser,
	getStoredUser,
	saveStoredUser,
} from "../../shared/utils/userStorage";
import type { AuthUser } from "../../shared/types/auth";

type AuthStatus = "idle" | "loading" | "succeeded" | "failed";

type AuthState = {
	token: string | null;
	user: AuthUser | null;
	status: AuthStatus;
	error: string | null;
};

const buildUserFromToken = (token: string | null): AuthUser | null => {
	if (!token) return null;
	const payload = parseToken(token);
	if (!payload?.id || !payload?.rol || !payload?.correo) return null;
	return {
		id_usuario: String(payload.id),
		nombre: String(payload.nombre ?? ""),
		apellido: String(payload.apellido ?? ""),
		correo: String(payload.correo ?? ""),
		rol: String(payload.rol ?? ""),
	};
};

const initialToken = getToken();
const initialStoredUser = getStoredUser();

const initialState: AuthState = {
	token: initialToken,
	user: initialStoredUser ?? buildUserFromToken(initialToken),
	status: "idle",
	error: null,
};

const authSlice = createSlice({
	name: "auth",
	initialState,
	reducers: {
		setToken: (state, action: PayloadAction<string>) => {
			state.token = action.payload;
			saveToken(action.payload);
		},
		setUser: (state, action: PayloadAction<AuthUser | null>) => {
			state.user = action.payload;
			saveStoredUser(action.payload);
		},
		clearAuth: (state) => {
			state.token = null;
			state.user = null;
			state.error = null;
			state.status = "idle";
			clearToken();
			clearStoredUser();
		},
		clearError: (state) => {
			state.error = null;
		},
		setStatus: (state, action: PayloadAction<AuthStatus>) => {
			state.status = action.payload;
		},
		setError: (state, action: PayloadAction<string | null>) => {
			state.error = action.payload;
		},
	},
});

const { setToken, setUser, clearAuth, clearError, setStatus, setError } =
	authSlice.actions;

export {
	authSlice,
	setToken,
	setUser,
	clearAuth,
	clearError,
	setStatus,
	setError,
};

export default authSlice.reducer;
