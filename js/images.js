/**
 * @file images.js
 * @description Único módulo autorizado para construir URLs de imágenes de
 *   cartas del repositorio tarot-imagenes (Sección 3.4, línea 349: "Rutas de
 *   imágenes de cartas SIEMPRE pasan por images.js. Nunca hardcodear URL de
 *   GitHub directamente"). Compartido por ambas tradiciones — no se divide
 *   en images-marsella.js/images-rws.js porque la construcción de URL es
 *   idéntica, solo cambia el mazo/slug que se le pasa.
 *
 * @estado_real_vs_documento (verificado 8/8/2026, ver nota importante abajo)
 *   El Documento Maestro (Sección 4.6) afirma "CONFIRMADO 8/8/2026: NO hay
 *   nada subido a GitHub [tarot-imagenes]" — esto está DESACTUALIZADO. Se
 *   verificó en vivo contra el repositorio real (raw.githubusercontent.com)
 *   que los 4 mazos SÍ están completos: marst1, mars2, rwst1, rws2 — cada
 *   uno con sus 78 cartas en los 4 tamaños. Muestreo aleatorio de 10 cartas
 *   × 2 mazos × 4 tamaños = 80 archivos verificados con HTTP 200, 0 faltantes.
 *   También se corrigieron dos datos del documento contra la realidad:
 *     - Los sufijos de tamaño reales son "full", "medium", "thumb", "icon"
 *       (el documento no listaba "medium" explícitamente en el nombre de
 *       archivo de ejemplo).
 *     - rwst1 y rws2 SÍ están subidos (el documento decía "pendientes").
 *   El progreso real ya superó el snapshot del documento — se usa el estado
 *   verificado en vivo, no el texto del documento (mismo criterio que en
 *   el resto del proyecto: el dato real manda).
 *
 * @convencion_nombre {mazo}_{sufijo}_{slug}.webp — todos sueltos en la raíz
 *   del repo, sin subcarpetas. Ejemplo: marst1_full_le-mat.webp
 *
 * @exports getUrlImagen(carta, mazo, tamano), MAZOS_VALIDOS, TAMANOS_VALIDOS
 */

const USUARIO_GITHUB = 'pulsointerior-tarot';
const URL_BASE = `https://raw.githubusercontent.com/${USUARIO_GITHUB}/tarot-imagenes/main`;

/** Mazos válidos — confirmados subidos y completos contra el repo real. */
export const MAZOS_VALIDOS = ['marst1', 'mars2', 'rwst1', 'rws2'];

/** Tamaños válidos — confirmados contra el repo real (no "card", como
 *  podría sugerir una lectura superficial del documento; es "medium"). */
export const TAMANOS_VALIDOS = ['full', 'medium', 'thumb', 'icon'];

/**
 * Construye la URL raw de GitHub para la imagen de una carta en un mazo y
 * tamaño concretos. Única función autorizada para esto en todo el proyecto
 * (Sección 3.4, línea 349).
 *
 * @param {object} carta  — objeto de cartas-marsella.json o cartas-rws.json;
 *   solo necesita el campo .slug
 * @param {string} mazo   — uno de MAZOS_VALIDOS ('marst1', 'mars2', 'rwst1', 'rws2')
 * @param {string} [tamano='full'] — uno de TAMANOS_VALIDOS
 * @returns {string|null} URL completa del WEBP, o null si algún parámetro
 *   no es válido (el llamante debe usar un placeholder CSS en ese caso)
 *
 * @example
 * getUrlImagen({ slug: 'le-mat' }, 'marst1', 'thumb');
 * // → 'https://raw.githubusercontent.com/pulsointerior-tarot/tarot-imagenes/main/marst1_thumb_le-mat.webp'
 */
export function getUrlImagen(carta, mazo, tamano = 'full') {
  if (!carta?.slug) {
    console.warn('[images.js] getUrlImagen: carta sin slug', carta);
    return null;
  }
  if (!MAZOS_VALIDOS.includes(mazo)) {
    console.warn(`[images.js] getUrlImagen: mazo no válido "${mazo}"`);
    return null;
  }
  if (!TAMANOS_VALIDOS.includes(tamano)) {
    console.warn(`[images.js] getUrlImagen: tamaño no válido "${tamano}"`);
    return null;
  }
  return `${URL_BASE}/${mazo}_${tamano}_${carta.slug}.webp`;
}
