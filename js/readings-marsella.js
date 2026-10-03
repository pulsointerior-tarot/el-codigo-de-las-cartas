/**
 * readings-marsella.js — Bridge tiradas, Tarot de Marsella
 * "El Código de las Cartas"
 *
 * Responsabilidad: centraliza el mapeo tema → columna de cartas-marsella.json
 * (Sección 8.6 del Documento Maestro). PROHIBIDO hardcodear este mapeo en
 * cualquier otro módulo (resultado-marsella.js, render-carta-marsella.js, etc.)
 * — todos deben importar mapearTemaAColumna() de aquí.
 *
 * @estado
 *   mapearTemaAColumna() — implementado y verificado contra cartas-marsella.json
 *   real (8/8/2026).
 *
 *   Resto del "bridge tiradas" (ensamblar estado de una tirada completa a
 *   partir de tiradas.json + posiciones.json) — implementado en
 *   veredicto-marsella.js, no en este módulo (tiradas.json y posiciones.json
 *   ya están disponibles y confirmados desde el 9/9/2026, 282 tiradas).
 *
 * Exports: mapearTemaAColumna(tema), TEMAS_VALIDOS
 */

// ── MAPEO TEMA → COLUMNA (Sección 8.6, Tabla 15 del Documento Maestro) ──────
// NOTA: la Tabla 15 del documento dice que en RWS el sufijo de "viajes" es
// "viajes_cambios" — verificado contra cartas-rws.json real (8/8/2026) y es
// incorrecto: el campo real en ambas tradiciones es "viajes_mudanzas". Se usa
// aquí el nombre real del JSON, no el de la tabla (mismo criterio que en
// data-marsella.js/data-rws.js y combinations-*.js: el dato manda).

const MAPA_TEMA_COLUMNA = {
  amor:                          'amor',
  consultas_generales:           'general_sino',
  creatividad_proyectos:         'creatividad',
  crisis_transformacion:         'crisis_transformacion',
  decisiones_elecciones:         'decisiones',
  espiritualidad_crecimiento:    'espiritualidad',
  familia_hogar:                 'familia_hogar',
  salud_bienestar:               'salud',
  trabajo_dinero:                'finanzas_trabajo',
  viajes_mudanzas:               'viajes_mudanzas', // real: no "viajes_cambios" (ver nota arriba)
};

/** Lista de valores válidos del enum "tema", en el mismo orden que la Tabla 15. */
export const TEMAS_VALIDOS = Object.keys(MAPA_TEMA_COLUMNA);

/**
 * Traduce un valor del enum "tema" (usado en posiciones.json) a la columna
 * base correspondiente en cartas-marsella.json (sin sufijo _recta/_inv —
 * eso lo añade quien consuma el resultado, según la orientación de la carta).
 *
 * @param {string} tema — uno de TEMAS_VALIDOS, ej: "amor", "trabajo_dinero"
 * @returns {string|null} columna base en cartas-marsella.json, o null si el
 *   tema no es reconocido
 *
 * @example
 * mapearTemaAColumna('trabajo_dinero'); // → 'finanzas_trabajo'
 * // luego, según orientación: carta['finanzas_trabajo_recta'] o carta['finanzas_trabajo_inv']
 */
export function mapearTemaAColumna(tema) {
  if (!tema || !(tema in MAPA_TEMA_COLUMNA)) {
    console.warn(`[readings-marsella.js] Tema no reconocido: "${tema}"`);
    return null;
  }
  return MAPA_TEMA_COLUMNA[tema];
}
