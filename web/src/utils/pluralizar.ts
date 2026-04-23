/**
 * Pluraliza el nombre de una unidad de medida en español.
 * 
 * @param unidad - Nombre en singular (ej. "Caja", "Galón", "Metro cúbico")
 * @param cantidad - Número que acompaña a la unidad
 * @returns La unidad en singular o plural según la cantidad
 */
export function pluralizarUnidad(unidad: string, cantidad: number): string {
  if (!unidad) return "";
  if (cantidad <= 1) return unidad;

  const u = unidad.trim();

  // ── Casos especiales / palabras compuestas ──────────────────────────────────
  const casosEspeciales: Record<string, string> = {
    "Metro cúbico": "Metros cúbicos",
    "Metro Cúbico": "Metros Cúbicos",
    "metro cúbico": "metros cúbicos",
  };
  if (casosEspeciales[u]) return casosEspeciales[u];

  // ── Extranjerismos que solo añaden "s" ─────────────────────────────────────
  const extranjerismos = ["Pallet", "pallet", "Kit", "kit"];
  if (extranjerismos.includes(u)) return u + "s";

  // ── Palabras con acento en última sílaba terminadas en vocal + "n" / "s" ──
  // Ej. "Galón" → "Galones" (pierde tilde)
  const tildesToDrop: Record<string, string> = {
    "Galón": "Galones",
    "galón": "galones",
    "Millón": "Millones",
    "millón": "millones",
  };
  if (tildesToDrop[u]) return tildesToDrop[u];

  // ── Terminación en vocal → añadir "s" ──────────────────────────────────────
  // Incluye: Caja→Cajas, Bulto→Bultos, Resma→Resmas, Saco→Sacos,
  //          Rollo→Rollos, Tonelada→Toneladas, Docena→Docenas,
  //          Litro→Litros, Mililitro→Mililitros, Unidad→Unidades (ver abajo),
  //          Pieza→Piezas, Lata→Latas, Bolsa→Bolsas, Ampolla→Ampollas,
  //          Frasco→Frascos, Sobre→Sobres (exc. terminación vocal→s)
  const vocales = ["a", "e", "i", "o", "u"];
  const lastChar = u[u.length - 1].toLowerCase();

  if (vocales.includes(lastChar)) {
    return u + "s";
  }

  // ── Terminación en consonante → añadir "es" ────────────────────────────────
  // Incluye: Barril→Barriles, Millar→Millares, Par→Pares, Kilo→Kilos (no, kilo es vocal)
  // "d" final: Unidad→Unidades, Miligramo (o)→ ya cubierto arriba
  return u + "es";
}

/**
 * Formatea cantidad + unidad con pluralización automática.
 * Ej: formatUnidad(5, "Caja") → "5 Cajas"
 */
export function formatUnidad(cantidad: number, unidad: string): string {
  const unidadFormateada = pluralizarUnidad(unidad, cantidad);
  return `${cantidad} ${unidadFormateada}`;
}
