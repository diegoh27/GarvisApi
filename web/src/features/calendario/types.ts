type Disponibilidad = {
	id_disponibilidad: string;
	fecha: string;
	hora_inicio: string;
	hora_fin: string;
	id_eco?: string | null;
	eco_nombre?: string | null;
	estado: number;
	estado_pago?: number;
	estado_cita?: number;
	/** Solo UI: datos de cita para popover */
	paciente_nombre?: string | null;
	paciente_apellido?: string | null;
};

type TimeOption = {
	value: string;
	label: string;
};

type FilterOption = {
	id: string;
	label: string;
};

export type { Disponibilidad, TimeOption, FilterOption };
