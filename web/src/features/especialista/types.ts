type Disponibilidad = {
	id_disponibilidad: string;
	fecha: string | Date;
	hora_inicio: string;
	hora_fin: string;
	id_eco?: string | null;
	eco_nombre?: string | null;
	estado: number;
	estado_pago?: number;
	estado_cita?: number;
};

type CitaEspecialista = {
	id_cita: string;
	id_paciente: string;
	fecha_cita: string | Date;
	hora_cita: string;
	estado_cita: number;
	estado_pago: number;
	paciente_nombre: string;
	paciente_apellido: string;
	paciente_telefono?: string | null;
	paciente_cedula?: string | null;
	paciente_correo?: string | null;
	paciente_tipo_sangre?: string | null;
	paciente_contacto_nombre?: string | null;
	paciente_contacto_telefono?: string | null;
	eco_nombre: string;
	orden?: string | null;
	resultado_archivo?: string | null;
	resultado_estado?: number | null;
	resultado_publicado?: string | Date | null;
};

type Informe = {
	id_informe: string;
	id_cita: string;
	id_especialista: string;
	reseña: string | null;
	recomendaciones: string | null;
	firma_url: string | null;
	informe_pdf_url: string | null;
	fecha_creacion: string | Date;
	fecha_actualizacion: string | Date | null;
	// Datos de la cita (vienen del backend)
	fecha_cita?: string | Date;
	hora_cita?: string;
	estado_cita?: number;
	paciente_nombre?: string;
	paciente_apellido?: string;
	eco_nombre?: string;
};

type CrearInformePayload = {
	id_cita: string;
	reseña?: string;
	recomendaciones?: string;
};

type ApiResponse<T> = {
	ok: boolean;
	data: T;
};

export type { ApiResponse, CitaEspecialista, Disponibilidad, Informe, CrearInformePayload };
