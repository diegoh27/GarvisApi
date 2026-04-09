/**
 * TINYINT desde MySQL/JSON a veces llega como string ("1", "3").
 * Usar siempre esto antes de comparar con ===
 */
export function estadoDisponibilidadNum(estado: unknown): number {
	const n = Number(estado);
	return Number.isFinite(n) ? n : NaN;
}

/**
 * Al fusionar dos filas en la misma celda (misma hora, varios ecos):
 * - Cita (4) > pendiente (0) > rechazado (2) > aprobado (1) > cancelado (3).
 * - Aprobado (1) debe ganar a cancelado (3): si quedaron filas 3 históricas junto a un 1 recién aprobado,
 *   la celda debe verse "Aprobada", no "Cancelada".
 */
export function mergeDisponibilidadEstado(existing: unknown, incoming: unknown): number {
	const e1 = estadoDisponibilidadNum(existing);
	const e2 = estadoDisponibilidadNum(incoming);
	if (e1 === 4 || e2 === 4) return 4;
	if (e1 === 0 || e2 === 0) return 0;
	if (e1 === 2 || e2 === 2) return 2;
	if (e1 === 1 || e2 === 1) return 1;
	if (e1 === 3 || e2 === 3) return 3;
	return Number.isFinite(e2) ? e2 : e1;
}
