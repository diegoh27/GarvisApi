/**
 * Bancos de Venezuela con códigos y servicios (TRF = Transferencia, P2P = Pago móvil).
 * TRF: solo transferencia. P2P: disponible para pago móvil.
 */
export type BancoVenezuela = {
	Name: string;
	Code: string;
	Services: string;
};

export const BANCOS_VENEZUELA: BancoVenezuela[] = [
	{ Name: "Banco Central de Venezuela", Code: "0001", Services: "TRF" },
	{ Name: "Banco Industrial de Venezuela", Code: "0003", Services: "" },
	{ Name: "Banco Guayana", Code: "0008", Services: "TRF" },
	{ Name: "Banco de Venezuela", Code: "0102", Services: "TRF, P2P" },
	{ Name: "Banco Venezolano de Crédito", Code: "0104", Services: "TRF, P2P" },
	{ Name: "Banco Mercantil", Code: "0105", Services: "TRF, P2P" },
	{ Name: "BBVA Banco Provincial", Code: "0108", Services: "TRF, P2P" },
	{ Name: "BanCaribe", Code: "0114", Services: "TRF, P2P" },
	{ Name: "Banco Exterior", Code: "0115", Services: "TRF, P2P" },
	{ Name: "Banco Caroní", Code: "0128", Services: "TRF, P2P" },
	{ Name: "Banesco", Code: "0134", Services: "TRF, P2P" },
	{ Name: "Banco Sofitasa", Code: "0137", Services: "TRF, P2P" },
	{ Name: "Banco Plaza", Code: "0138", Services: "TRF, P2P" },
	{ Name: "BanGente", Code: "0146", Services: "TRF, P2P" },
	{ Name: "Banco Fondo Común (BFC)", Code: "0151", Services: "TRF, P2P" },
	{ Name: "100% Banco", Code: "0156", Services: "TRF, P2P" },
	{ Name: "Del Sur", Code: "0157", Services: "TRF, P2P" },
	{ Name: "Banco del Tesoro", Code: "0163", Services: "TRF, P2P" },
	{ Name: "Banco Agrícola de Venezuela", Code: "0166", Services: "TRF, P2P" },
	{ Name: "BanCrecer, Banco de Desarrolo", Code: "0168", Services: "TRF, P2P" },
	{ Name: "R4, Banco Microfinanciero, C.A.", Code: "0169", Services: "TRF, P2P" },
	{ Name: "Banco Activo", Code: "0171", Services: "TRF, P2P" },
	{ Name: "Bancamiga Banco Universal, C.A.", Code: "0172", Services: "TRF, P2P" },
	{ Name: "Banco Internacional de Desarrollo", Code: "0173", Services: "TRF" },
	{ Name: "BanPlus,  Banco Comercial", Code: "0174", Services: "TRF, P2P" },
	{ Name: "Banco Digital de los Trabajadores, Banco Universal, C.A.", Code: "0175", Services: "TRF, P2P" },
	{ Name: "Novo Banco, S.A. Sucursal Venezuela, Banco Universal", Code: "0176", Services: "TRF" },
	{ Name: "Banco de las Fuerzas Armadas", Code: "0177", Services: "TRF, P2P" },
	{ Name: "N58 Banco Digital, Banco Microfinanciero, S.A.", Code: "0178", Services: "TRF, P2P" },
	{ Name: "Banco Nacional de Crédito, C.A. Banco Universal", Code: "0191", Services: "TRF, P2P" },
	{ Name: "ABN-AMRO Bank", Code: "0196", Services: "TRF" },
	{ Name: "Instituto Municipal de Crédito Popular", Code: "0601", Services: "TRF, P2P" },
];

/** Opciones de tipo de cédula (Venezuela) */
export const CEDULA_PREFIXES = ["V", "J", "E", "P", "G"] as const;

/** Prefijos de teléfono móvil Venezuela (mismo orden que registro: 0412, 0414, 0416, 0421, 0422, 0424, 0426) */
export const TELEFONO_PREFIXES = ["0412", "0414", "0416", "0421", "0422", "0424", "0426"] as const;
