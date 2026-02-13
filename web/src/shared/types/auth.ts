type LoginPayload = {
	correo: string;
	contrasena: string;
};

type RegisterPayload = {
	nombre: string;
	apellido: string;
	genero: "Masculino" | "Femenino";
	cedula: string;
	correo: string;
	telefono: string;
	contrasena: string;
	fecha_nacimiento: string;
	tipo_sangre: string;
	descripcion: string;
	direccion?: string;
	rif?: string;
	contacto_emergencia_nombre?: string;
	contacto_emergencia_telefono?: string;
};

type AuthUser = {
	id_usuario: string;
	nombre: string;
	apellido: string;
	correo: string;
	rol: string;
};

type LoginResponse = {
	ok: boolean;
	message: string;
	token: string;
	user: AuthUser;
};

type RegisterResponse = {
	ok: boolean;
	message: string;
	data: {
		id_usuario: string;
		id_paciente: string;
		nombre: string;
		apellido: string;
		correo: string;
		telefono: string;
	};
};

export type {
	LoginPayload,
	RegisterPayload,
	AuthUser,
	LoginResponse,
	RegisterResponse,
};
