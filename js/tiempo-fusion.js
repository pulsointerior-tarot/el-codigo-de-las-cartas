/**
 * @file tiempo-fusion.js
 * @description Regla de "tiempo fusionado" para el cierre de Parte B —
 *   definición cerrada el 24/8/2026 tras probar contra datos reales.
 *
 *   Marsella: comb_tiempo es texto libre narrativo (23.999 valores, 23.733
 *   únicos). Se clasifica por palabras clave con prioridad año > mes >
 *   semana > día (gana la unidad MÁS LARGA mencionada — resuelve el 52%
 *   de los casos que mezclan "semana" y "mes" en la misma frase, ej. "de
 *   semanas a pocos meses" → mediano, no corto). Si no hay ninguna palabra
 *   clave (876 casos reales, ej. "varios ciclos lunares") → variable.
 *
 *   RWS: comb_tiempo ya viene categorizado en 4 valores fijos
 *   ("Categoría — descripción"). No se parsea nada — se toma literal la
 *   palabra antes del guion.
 *
 * @exports clasificarTiempoMarsella, clasificarTiempoRWS, fusionarTiempos
 */

// ── MARSELLA ──────────────────────────────────────────────────────────────

const ORDEN_PRIORIDAD = [
  { categoria: 'largo',   patrones: [/\baño[s]?\b/i] },
  { categoria: 'mediano', patrones: [/\bmes(es)?\b/i] },
  { categoria: 'corto',   patrones: [/\bsemana[s]?\b/i] },
  { categoria: 'corto',   patrones: [/\bd[ií]a[s]?\b/i] },
];

/**
 * @param {string} texto — comb_tiempo de Marsella (texto libre)
 * @returns {'corto'|'mediano'|'largo'|'variable'}
 */
export function clasificarTiempoMarsella(texto) {
  const t = String(texto || '');
  for (const { categoria, patrones } of ORDEN_PRIORIDAD) {
    if (patrones.some(re => re.test(t))) return categoria;
  }
  return 'variable';
}

// ── RWS ───────────────────────────────────────────────────────────────────

/**
 * @param {string} texto — comb_tiempo de RWS, formato "Categoría — descripción"
 * @returns {string} la categoría literal (ej. "Variable", "Semanas", "1-3 meses", "3-6 meses")
 */
export function clasificarTiempoRWS(texto) {
  const t = String(texto || '');
  return t.split('—')[0].trim() || 'Variable';
}

// ── FUSIÓN (cierre de Parte B) ───────────────────────────────────────────

const ETIQUETAS_MARSELLA = {
  corto: 'corto plazo, de días a pocas semanas',
  mediano: 'mediano plazo, de semanas a algunos meses',
  largo: 'largo plazo, de varios meses a más de un año',
  variable: 'variable, sin un plazo claro',
};

/**
 * Fusiona el comb_tiempo de los pares de una tirada en la frase de cierre
 * de Parte B.
 *
 * @param {Array<string>} textosTiempo — comb_tiempo de cada par
 * @param {'marsella'|'rws'} mazo
 * @returns {string} frase de cierre lista para insertar en Parte B
 */
export function fusionarTiempos(textosTiempo, mazo) {
  if (mazo === 'rws') {
    const categorias = textosTiempo.map(clasificarTiempoRWS);
    const unicas = [...new Set(categorias)];
    if (unicas.length === 1) {
      return `El marco temporal es consistente: ${unicas[0]}.`;
    }
    // Orden aproximado de "cuán largo" para elegir min/max al describir el rango
    const orden = ['Variable', 'Semanas', '1-3 meses', '3-6 meses'];
    const ordenadas = [...categorias].sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
    return `El marco temporal es variable: desde ${ordenadas[0]} hasta ${ordenadas[ordenadas.length - 1]}.`;
  }

  // Marsella
  const categorias = textosTiempo.map(clasificarTiempoMarsella);
  const unicas = [...new Set(categorias)];
  if (unicas.length === 1) {
    return `El marco temporal es consistente: se resuelve en ${ETIQUETAS_MARSELLA[unicas[0]]}.`;
  }
  const orden = ['corto', 'mediano', 'largo', 'variable'];
  const ordenadas = [...categorias].sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
  return `El marco temporal es variable: desde ${ETIQUETAS_MARSELLA[ordenadas[0]].split(',')[0]} hasta ${ETIQUETAS_MARSELLA[ordenadas[ordenadas.length - 1]].split(',')[0]}.`;
}
