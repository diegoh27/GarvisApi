/**
 * Calcula el RIF completo (con dígito verificador) para Venezuela.
 * Algoritmo oficial: Módulo 11
 * @param tipo - Letra del documento: 'V', 'E', 'J', 'P', 'G'
 * @param cedula - Número de cédula sin guiones ni puntos
 * @returns RIF completo (ej: "V123456789") o string vacío si los datos son inválidos.
 */
export const calculateRIF = (tipo: string, cedula: string): string => {
	// 1. Validaciones básicas
	if (!tipo || !cedula) return "";

	// Normalizar datos (mayúsculas y string)
	tipo = tipo.toUpperCase();
	let cedulaStr = cedula.toString().replace(/\.|-|\s/g, ""); // Quita puntos, guiones o espacios

	// 2. Tabla de valores para las letras
	const valoresTipo: Record<string, number> = {
		V: 4,
		E: 8,
		J: 12,
		P: 16,
		G: 20,
	};

	// Si el tipo no es válido, retornamos string vacío
	if (!valoresTipo[tipo]) {
		return "";
	}

	// 3. Rellenar con ceros a la izquierda hasta llegar a 8 dígitos (estándar del algoritmo)
	// Ejemplo: Si la cédula es "123", se convierte en "00000123"
	while (cedulaStr.length < 8) {
		cedulaStr = "0" + cedulaStr;
	}

	// Validar que después de rellenar tenga exactamente 8 dígitos
	if (cedulaStr.length !== 8 || !/^\d+$/.test(cedulaStr)) {
		return "";
	}

	// 4. Algoritmo Módulo 11
	const multiplicadores = [3, 2, 7, 6, 5, 4, 3, 2];

	// Valor inicial basado en la letra
	let suma = valoresTipo[tipo];

	// Recorremos los 8 dígitos y multiplicamos por su peso correspondiente
	for (let i = 0; i < 8; i++) {
		const digito = parseInt(cedulaStr.charAt(i));
		suma += digito * multiplicadores[i];
	}

	// 5. Calcular residuo y dígito final
	const residuo = suma % 11;
	let digitoVerificador = 0;

	if (residuo > 1) {
		digitoVerificador = 11 - residuo;
	} else {
		// Si el residuo es 0 o 1, el dígito es 0
		digitoVerificador = 0;
	}

	// 6. Retornar resultado final (sin guiones)
	return tipo + cedulaStr + digitoVerificador;
};
