type Disponibilidad = {
	id_disponibilidad: string;
	fecha: string;
	hora_inicio: string;
	hora_fin: string;
	estado: number;
	estado_pago?: number;
	estado_cita?: number;
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
