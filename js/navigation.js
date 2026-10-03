/**
 * @file navigation.js
 * @description Gestión de estado entre páginas y navegación.
 *   Es el ÚNICO módulo que accede a localStorage y URLSearchParams.
 *   Ninguna página HTML accede directamente a estas APIs.
 *
 * @architecture — Contrato de estado (Regla 9):
 *   URL params    → estado efímero de navegación (leído una vez al cargar).
 *                   Usado para pasar ids entre páginas (ej: ?id=t042&tema=amor).
 *   localStorage  → estado de sesión del usuario (persiste entre páginas y recargas).
 *                   Claves EXACTAS (Documento Maestro v3.5, Sección 5.2, Tabla 3):
 *                     tradicion          — "marsella" | "rws"
 *                     mazo_seleccionado  — "marst1" | "mars2" | "rwst1" | "rws2"
 *                     modo_lectura       — "automatico" | "manual"
 *                     tirada_actual      — JSON {id_tirada, tema, num_cartas, cartas[], timestamp}
 *                   timestamp_tirada NO se guarda como clave aparte: va embebido
 *                   como campo "timestamp" dentro del propio objeto tirada_actual
 *                   (más simple, un único read/write; incluido explícitamente
 *                   aquí porque la Tabla 3 lo lista como clave separada — es la
 *                   misma información, solo que anidada en vez de suelta).
 *   sessionStorage → PROHIBIDO. No se usa en este proyecto para evitar
 *                    fragmentación del estado entre pestañas.
 *
 * @correccion (extensión sobre la versión copiada en el punto 5, Sección 10.1:
 *   "extender → modificar → reescribir", nunca reescritura completa sin
 *   justificar): la versión original de este archivo (heredada del repo
 *   viejo de un solo mazo/tradición) usaba la clave "modo_seleccionado" en
 *   vez de "modo_lectura", no tenía función alguna de tradición, y
 *   getMazo() devolvía por defecto "1" (id del esquema viejo de 3 mazos,
 *   inválido en el esquema nuevo de 4 mazos marst1/mars2/rwst1/rws2).
 *   Corregido contra la Tabla 3 del Documento Maestro v3.5.
 *
 * @exports getMazo, setMazo, getModo, setModo, getTradicion, setTradicion,
 *          getTiradaActual, setTiradaActual, clearTiradaActual, navigateTo,
 *          getUrlParam, verificarEstadoRecovery
 */

// ── MAZO ───────────────────────────────────────────────────────────────────

/**
 * Lee el mazo seleccionado del usuario desde localStorage.
 * Sin default: si no hay nada guardado, devuelve null (el llamante debe
 * tratarlo como "sin selección todavía" y redirigir a introduccion.html
 * si la página lo requiere — no existe un mazo "por defecto" razonable
 * entre 4 mazos igual de válidos, Sección 7.1 del maestro).
 *
 * @returns {string|null} "marst1" | "mars2" | "rwst1" | "rws2" | null
 */
export function getMazo() {
  return localStorage.getItem('mazo_seleccionado');
}

/**
 * Guarda el mazo seleccionado en localStorage.
 * El valor persiste entre páginas y recargas sin expiración.
 *
 * @param {string} valor — "marst1" | "mars2" | "rwst1" | "rws2"
 */
export function setMazo(valor) {
  localStorage.setItem('mazo_seleccionado', valor);
}

// ── TRADICIÓN ─────────────────────────────────────────────────────────────
// Nueva (no existía en la versión original de este archivo, ver @correccion
// arriba). Se deriva del mazo elegido en introduccion.html (Sección 7.1):
//   marst1 | mars2 → tradicion: marsella
//   rwst1  | rws2  → tradicion: rws

/**
 * Lee la tradición activa desde localStorage.
 * @returns {string|null} "marsella" | "rws" | null si no hay selección aún
 */
export function getTradicion() {
  return localStorage.getItem('tradicion');
}

/**
 * Guarda la tradición activa en localStorage.
 * @param {string} valor — "marsella" | "rws"
 */
export function setTradicion(valor) {
  localStorage.setItem('tradicion', valor);
}

/**
 * Deriva la tradición correspondiente a un id de mazo, sin necesidad de
 * tener ya guardado nada en localStorage. Útil en introduccion.html al
 * hacer clic en un mazo, antes de guardar nada.
 * @param {string} idMazo — "marst1" | "mars2" | "rwst1" | "rws2"
 * @returns {string|null} "marsella" | "rws" | null si idMazo no es válido
 */
export function derivarTradicion(idMazo) {
  if (idMazo === 'marst1' || idMazo === 'mars2') return 'marsella';
  if (idMazo === 'rwst1' || idMazo === 'rws2') return 'rws';
  return null;
}

// ── MODO ────────────────────────────────────────────────────────────────────

/**
 * Lee el modo de selección de cartas del usuario desde localStorage.
 * Si no hay valor guardado, devuelve el modo por defecto.
 *
 * @returns {string} "automatico" | "manual" — default "automatico"
 */
export function getModo() {
  return localStorage.getItem('modo_lectura') || 'automatico';
}

/**
 * Guarda el modo de selección de cartas en localStorage.
 *
 * @param {string} valor — "automatico" | "manual"
 */
export function setModo(valor) {
  localStorage.setItem('modo_lectura', valor);
}

// ── TIRADA ACTUAL ───────────────────────────────────────────────────────────

/**
 * Lee la tirada actual del localStorage y verifica su validez temporal.
 * Si la tirada ha expirado (más de 24 horas desde el timestamp), la elimina.
 * Fase 8A: añade logs de debug para diagnóstico.
 *
 * @returns {Object|null} objeto tirada válido, o null si no existe o ha expirado.
 *   Estructura esperada del objeto devuelto:
 *   {
 *     id_tirada: string,
 *     nombre: string,
 *     tema: string,
 *     num_cartas: number,
 *     cartas: Array<{id, orientacion, posicion}>,
 *     timestamp: number
 *   }
 */
export function getTiradaActual() {
  try {
    const raw = localStorage.getItem('tirada_actual');
    if (!raw) return null;
    const tirada = JSON.parse(raw);
    if (!tirada.timestamp || Date.now() - tirada.timestamp > 86400000) {
      console.debug('[navigation] Tirada expirada, limpiando...');
      clearTiradaActual();
      return null;
    }
    console.debug('[navigation] Tirada válida, timestamp OK');
    return tirada;
  } catch {
    return null;
  }
}

/**
 * Guarda la tirada actual en localStorage con timestamp = Date.now().
 * El timestamp se usa para detectar expiración en getTiradaActual().
 *
 * @param {Object} obj — objeto tirada a guardar. Estructura:
 *   {
 *     id_tirada: string,
 *     nombre: string,
 *     tema: string,
 *     num_cartas: number,
 *     cartas: Array<{id, orientacion, posicion}>
 *   }
 */
export function setTiradaActual(obj) {
  const datos = { ...obj, timestamp: Date.now() };
  localStorage.setItem('tirada_actual', JSON.stringify(datos));
}

/**
 * Elimina la tirada actual del localStorage.
 * Debe llamarse al iniciar una nueva tirada o al navegar a inicio.
 */
export function clearTiradaActual() {
  localStorage.removeItem('tirada_actual');
}

// ── NAVEGACIÓN ──────────────────────────────────────────────────────────────

/**
 * Navega a la URL indicada usando window.location.href.
 * Centraliza toda la navegación programática del proyecto.
 *
 * @param {string} url — ruta relativa o absoluta, ej: "resultado.html" o "tipos-lecturas.html"
 */
export function navigateTo(url) {
  window.location.href = url;
}

/**
 * Lee el valor de un parámetro de la URL actual (query string).
 * Centraliza todo acceso a URLSearchParams.
 *
 * @param {string} param — nombre del parámetro, ej: "id", "tema", "id1"
 * @returns {string|null} valor del parámetro o null si no existe
 *
 * @example
 * // URL: detalle-tirada.html?id=t042&tema=amor
 * getUrlParam('id');   // → "t042"
 * getUrlParam('tema'); // → "amor"
 * getUrlParam('foo');  // → null
 */
export function getUrlParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

// ── RECOVERY — FASE 8A ──────────────────────────────────────────────────────

/**
 * Verifica si existe el estado necesario para renderizar una página concreta.
 * Debe llamarse al inicio del script de init de cada página, antes de cualquier render.
 * Si devuelve { ok: false }, el caller debe llamar navigateTo(check.redirectTo) inmediatamente.
 *
 * Casos actualizados contra la Sección 5.3 del Documento Maestro v3.5 (los
 * redirects de resultado y detalle-combinacion ahora son por-tradición, ya
 * que esas páginas se dividieron en versiones -marsella/-rws — Sección 3.1).
 *
 * @param {'indicar-cartas'|'resultado'|'detalle-combinacion'|'detalle-tirada'} paginaActual
 * @param {string} [tradicion] — "marsella" | "rws", requerido solo para
 *   'resultado' y 'detalle-combinacion' (para construir el redirect correcto
 *   a -marsella.html o -rws.html). Si se omite, se usa getTradicion().
 * @returns {{ ok: boolean, redirectTo: string|null, motivo: string }}
 *
 * @example
 * const check = verificarEstadoRecovery('resultado', 'marsella');
 * if (!check.ok) { navigateTo(check.redirectTo); return; }
 *
 * Reglas por página (Sección 5.3):
 *   "indicar-cartas"      → necesita getTiradaActual() != null
 *                           si null: redirect a tipos-lecturas.html (motivo: sin_tirada)
 *   "resultado"           → necesita getTiradaActual() != null Y tirada.cartas.length > 0
 *                           si null/expirada o cartas vacías: redirect a introduccion.html
 *   "detalle-combinacion" → necesita params id1 e id2 en URL
 *                           si faltan: redirect a combinaciones-{tradicion}.html
 *   "detalle-tirada"      → necesita param id en URL
 *                           si falta: redirect a tipos-lecturas.html (motivo: sin_id)
 *   (combinaciones-*.html y arcanos.html son puntos de entrada independientes,
 *   no necesitan verificación — no se incluyen en este switch)
 */
export function verificarEstadoRecovery(paginaActual, tradicion) {
  const trad = tradicion || getTradicion() || 'marsella';

  switch (paginaActual) {

    case 'indicar-cartas': {
      const tirada = getTiradaActual();
      if (!tirada) {
        return { ok: false, redirectTo: 'tipos-lecturas.html', motivo: 'sin_tirada' };
      }
      return { ok: true, redirectTo: null, motivo: '' };
    }

    case 'resultado': {
      const destinoSinEstado = `introduccion.html`;
      const tirada = getTiradaActual();
      if (!tirada) {
        return { ok: false, redirectTo: destinoSinEstado, motivo: 'sin_tirada' };
      }
      if (!tirada.cartas || tirada.cartas.length === 0) {
        return { ok: false, redirectTo: destinoSinEstado, motivo: 'sin_cartas' };
      }
      return { ok: true, redirectTo: null, motivo: '' };
    }

    case 'detalle-combinacion': {
      const id1 = getUrlParam('id1');
      const id2 = getUrlParam('id2');
      if (!id1 || !id2) {
        return { ok: false, redirectTo: `combinaciones-${trad}.html`, motivo: 'sin_params' };
      }
      return { ok: true, redirectTo: null, motivo: '' };
    }

    case 'detalle-tirada': {
      const id = getUrlParam('id');
      if (!id) {
        return { ok: false, redirectTo: 'tipos-lecturas.html', motivo: 'sin_id' };
      }
      return { ok: true, redirectTo: null, motivo: '' };
    }

    default:
      return { ok: true, redirectTo: null, motivo: '' };
  }
}
