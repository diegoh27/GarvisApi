/**
 * Convierte un precio en USD a VES usando la tasa del dólar oficial
 * @param precioUSD - Precio en dólares
 * @param tasaDolar - Tasa del dólar (promedio)
 * @returns Precio en VES (Bolívares)
 */
export const convertUSDToVES = (precioUSD: number, tasaDolar: number): number => {
	return precioUSD * tasaDolar;
};

/**
 * Formatea un número como moneda venezolana (VES)
 * @param monto - Monto a formatear
 * @returns String formateado como "Bs. X.XXX,XX"
 */
export const formatVES = (monto: number): string => {
	return `Bs. ${monto.toLocaleString("es-VE", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
};

/**
 * Formatea un número como moneda estadounidense (USD)
 * @param monto - Monto a formatear
 * @returns String formateado como "$ X.XXX,XX"
 */
export const formatUSD = (monto: number): string => {
	return `$${monto.toLocaleString("es-VE", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
};
