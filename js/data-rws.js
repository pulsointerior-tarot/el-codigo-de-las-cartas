/**
 * @file data-rws.js
 * @description ÚNICA FUENTE DE VERDAD para los datos de la tradición RWS
 *   (Rider-Waite-Smith). Gestiona la carga, caché y acceso a todos los JSON
 *   de data/rws/. Ningún otro módulo hace fetch() directamente a estas rutas
 *   (Sección 10.1). Hermano de data-marsella.js — mismo contrato de funciones,
 *   implementación independiente porque los campos y formatos de cada
 *   tradición difieren (ver comentario en buscarCombinacion más abajo).
 *
 * @dependencies
 *   - data/rws/cartas.json (78 registros)
 *   - data/rws/tiradas.json
 *   - data/rws/posiciones.json
 *   - data/rws/sinonimos.json
 *   - data/rws/combinaciones-mm/{id_carta_1}.json
 *   - data/rws/combinaciones-maymen/{palo}/{id_carta_1}.json
 *   - data/rws/combinaciones-menmay/{palo}/{id_carta_1}.json
 *   - data/rws/combinaciones-menmen/{palo1}-{palo2}/{id_carta_1}.json
 *     (23.999 registros de combinación en total, carga lazy por chunks)
 *
 * @exports getCartas, getCartaById, getTiradas, getTiradaById,
 *          getPosicionesByTirada, getSinonimos, buscarCombinacion,
 *          buscarTodasLasPosiciones, getPosicionCombinacion, DataLoadError
 *
 * @architecture
 *   Caché en objeto plano (_cache) para JSON base y Map (_cacheChunks) para chunks.
 *   PROHIBIDO duplicar estas funciones en cualquier otro módulo (Sección 10.1).
 */

// ── CLASE DE ERROR TIPADA ────────────────────────────────────────────────────

class DataLoadError extends Error {
  constructor(url, cause) {
    super(`No se pudo cargar: ${url}`);
    this.name = 'DataLoadError';
    this.url = url;
    this.cause = cause;
  }
}

export { DataLoadError };

// ── RUTA BASE ─────────────────────────────────────────────────────────────────

const BASE = 'data/rws';

// ── CACHÉ ────────────────────────────────────────────────────────────────────

const _cache = {};

// ── CARGA GENÉRICA ───────────────────────────────────────────────────────────

/**
 * Carga genérica con caché y manejo de errores tipado.
 *
 * @param {string} key — clave de caché interna
 * @param {string} url — ruta relativa al JSON
 * @returns {Promise<any>} datos parseados del JSON
 * @throws {DataLoadError} si la petición falla o el JSON es inválido
 */
async function _load(key, url) {
  if (_cache[key]) return _cache[key];
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} al cargar ${url}`);
    const datos = await res.json();
    _cache[key] = datos;
    return datos;
  } catch (err) {
    console.error(`[data-rws.js] Error cargando ${url}:`, err);
    throw new DataLoadError(url, err);
  }
}

/**
 * Normaliza un registro de tirada para que siempre tenga id_tirada y nombre_tirada
 * independientemente de si el JSON usa "id"/"nombre" o "id_tirada"/"nombre_tirada".
 * @param {object} t — registro raw de tiradas.json
 * @returns {object}
 */
function _normalizarTirada(t) {
  return {
    ...t,
    id_tirada:     t.id_tirada     || t.id,
    nombre_tirada: t.nombre_tirada || t.nombre,
  };
}

// —— FUNCIONES PÚBLICAS — DATOS BASE ——————————————————————————————————————————

/**
 * Devuelve el array completo de 78 cartas de RWS desde cartas.json.
 *
 * @returns {Promise<Array<object>>} array de 78 objetos carta
 * @throws {DataLoadError} si cartas.json no puede cargarse
 */
export async function getCartas() {
  return _load('cartas', `${BASE}/cartas.json`);
}

/**
 * Devuelve la carta cuyo campo id coincide con el valor indicado.
 *
 * @param {number} id — ID de la carta (1–78)
 * @returns {Promise<object|undefined>} objeto carta o undefined si no existe
 * @throws {DataLoadError} si cartas.json no puede cargarse
 *
 * @example
 * const carta = await getCartaById(1); // THE FOOL
 */
export async function getCartaById(id) {
  const cartas = await getCartas();
  return cartas.find(c => c.id === id);
}

/**
 * Devuelve las tiradas del JSON, opcionalmente filtradas por tema.
 *
 * @param {string|null} [filtroTema=null] — valor exacto del campo tema
 * @returns {Promise<Array<object>>} array de tiradas normalizadas
 * @throws {DataLoadError} si tiradas.json no puede cargarse
 */
export async function getTiradas(filtroTema = null) {
  const raw = await _load('tiradas', `${BASE}/tiradas.json`);
  const tiradas = raw.map(_normalizarTirada);
  if (!filtroTema) return tiradas;
  return tiradas.filter(t => t.tema === filtroTema);
}

/**
 * Devuelve la tirada con el id_tirada indicado.
 *
 * @param {string} idTirada — ej: "t042"
 * @returns {Promise<object|undefined>} objeto tirada normalizado o undefined
 * @throws {DataLoadError} si tiradas.json no puede cargarse
 */
export async function getTiradaById(idTirada) {
  const raw = await _load('tiradas', `${BASE}/tiradas.json`);
  const tiradas = raw.map(_normalizarTirada);
  return tiradas.find(t => t.id_tirada === idTirada);
}

/**
 * Devuelve las posiciones de posiciones.json que pertenecen a la tirada indicada.
 *
 * @param {string} idTirada — ej: "t042"
 * @returns {Promise<Array<object>>} array de posiciones (vacío si no hay)
 * @throws {DataLoadError} si posiciones.json no puede cargarse
 */
export async function getPosicionesByTirada(idTirada) {
  const posiciones = await _load('posiciones', `${BASE}/posiciones.json`);
  return posiciones.filter(p => (p.tirada_id || p.id_tirada) === idTirada);
}

/**
 * Devuelve el objeto completo de sinonimos.json.
 * Usado por conclusion-rws.js para rellenar los slots dinámicos de las plantillas.
 *
 * @returns {Promise<object>} objeto con categorías como claves y arrays de sinónimos como valores
 * @throws {DataLoadError} si sinonimos.json no puede cargarse
 */
export async function getSinonimos() {
  return _load('sinonimos', `${BASE}/sinonimos.json`);
}

/**
 * Devuelve la clasificación de tipo de veredicto para una tirada, si existe.
 * Tiradas no listadas en tipos-veredicto.json se consideran 'sin_veredicto'
 * cuando tienen más de una carta (evita forzar un sí/no en tiradas
 * exploratorias o de comparación A/B que no lo tienen) y 'directa' cuando
 * tienen una sola carta (ahí no hay conteo, solo se lee su respuesta_corta).
 *
 * @param {string} idTirada
 * @param {number} numCartas
 * @returns {Promise<object>} { tipo_veredicto, posiciones?, posicion_resolutiva? }
 * @throws {DataLoadError} si tipos-veredicto.json no puede cargarse
 */
export async function getTipoVeredicto(idTirada, numCartas) {
  const tipos = await _load('tiposVeredicto', `${BASE}/tipos-veredicto.json`);
  if (tipos[idTirada]) return tipos[idTirada];
  return { tipo_veredicto: numCartas === 1 ? 'directa' : 'sin_veredicto' };
}

// —— COMBINACIONES — CARGA LAZY POR CHUNKS ———————————————————————————————————

// Cache de chunks ya cargados: clave = ruta relativa del chunk → Map indexado
const _cacheChunks = new Map();

// Rangos de id por palo — confirmado contra cartas-rws.json vía slug (campo palo_rds
// viene vacío en los registros; el rango de id es la fuente fiable, Fase de datos 8/8/2026)
// Mayores: 1–22 (sin palo) · Menores: 23–36 wands · 37–50 cups · 51–64 swords · 65–78 pentacles
const PALO_RANGOS = [
  { min: 23, max: 36, carpeta: 'wands' },
  { min: 37, max: 50, carpeta: 'cups' },
  { min: 51, max: 64, carpeta: 'swords' },
  { min: 65, max: 78, carpeta: 'pentacles' },
];

/**
 * Devuelve el nombre de carpeta de palo correspondiente a un id de carta menor.
 * @param {number} id — ID de carta menor (23–78)
 * @returns {string|null} 'wands' | 'cups' | 'swords' | 'pentacles' | null si id no es menor
 */
function _paloCarpeta(id) {
  const rango = PALO_RANGOS.find(r => id >= r.min && id <= r.max);
  return rango ? rango.carpeta : null;
}

/**
 * Determina la ruta relativa exacta del chunk JSON que contiene la combinación
 * id1→id2, según el esquema real de carpetas subido al repositorio:
 *   - Mayor + Mayor:  combinaciones-mm/{id1}.json
 *   - Mayor + Menor:  combinaciones-maymen/{palo(id2)}/{id1}.json
 *   - Menor + Mayor:  combinaciones-menmay/{palo(id1)}/{id1}.json
 *   - Menor + Menor:  combinaciones-menmen/{palo(id1)}-{palo(id2)}/{id1}.json
 * IMPORTANTE: el orden de id1/id2 es significativo — A+B ≠ B+A.
 *
 * @param {number} id1
 * @param {number} id2
 * @returns {string} ruta relativa dentro de data/rws/
 */
function _rutaChunk(id1, id2) {
  const es1Mayor = id1 <= 22;
  const es2Mayor = id2 <= 22;

  if (es1Mayor && es2Mayor) {
    return `combinaciones-mm/${id1}.json`;
  }
  if (es1Mayor && !es2Mayor) {
    return `combinaciones-maymen/${_paloCarpeta(id2)}/${id1}.json`;
  }
  if (!es1Mayor && es2Mayor) {
    return `combinaciones-menmay/${_paloCarpeta(id1)}/${id1}.json`;
  }
  return `combinaciones-menmen/${_paloCarpeta(id1)}-${_paloCarpeta(id2)}/${id1}.json`;
}

/**
 * Carga el chunk JSON para el par id1/id2 e indexa por clave "{id2}-{posicion}".
 * A diferencia de Marsella, el campo "posicion" en los JSON de RWS ya viene
 * como código corto limpio ("RR"/"RI"/"IR"/"II"), sin texto descriptivo —
 * confirmado contra los JSON reales, no requiere extracción con regex.
 * Devuelve Map vacío si el archivo no existe (sin romper la app).
 *
 * @param {number} id1
 * @param {number} id2
 * @returns {Promise<Map<string, object>>} Map indexado por "{id_carta_2}-{RR|RI|IR|II}"
 */
async function _cargarChunk(id1, id2) {
  const rutaRelativa = _rutaChunk(id1, id2);

  if (_cacheChunks.has(rutaRelativa)) {
    return _cacheChunks.get(rutaRelativa);
  }

  const url = `${BASE}/${rutaRelativa}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    const datos = await res.json();
    const indice = new Map(
      datos.map(r => [`${r.id_carta_2}-${r.posicion}`, r])
    );
    _cacheChunks.set(rutaRelativa, indice);
    return indice;
  } catch (err) {
    console.warn(`[data-rws.js] Chunk no disponible: ${url}`, err);
    _cacheChunks.set(rutaRelativa, new Map());
    return new Map();
  }
}

/**
 * Busca la combinación entre dos cartas en la posición dada.
 * Carga el chunk de id1/id2 de forma lazy y cachea el resultado.
 * Si el chunk falla al cargar, devuelve null sin propagar el error al caller.
 *
 * @param {number} id1      — ID de la primera carta (1–78)
 * @param {number} id2      — ID de la segunda carta (1–78, distinta de id1)
 * @param {string} posicion — Orientación combinada: "RR" | "RI" | "IR" | "II"
 * @returns {Promise<object|null>} objeto combinación con todos sus campos, o null si no existe
 *
 * @example
 * const comb = await buscarCombinacion(1, 37, 'RR');
 * if (comb) console.log(comb.interpretacion);
 */
export async function buscarCombinacion(id1, id2, posicion) {
  try {
    const chunk = await _cargarChunk(id1, id2);
    return chunk.get(`${id2}-${posicion}`) ?? null;
  } catch (err) {
    console.error('[data-rws.js] Error en buscarCombinacion:', { id1, id2, posicion }, err);
    return null;
  }
}

/**
 * Carga todas las combinaciones de id1 con id2 en las 4 posiciones posibles.
 * Las 4 búsquedas comparten el mismo chunk (ya cacheado tras la primera).
 *
 * @param {number} id1
 * @param {number} id2
 * @returns {Promise<{RR: object|null, RI: object|null, IR: object|null, II: object|null}>}
 */
export async function buscarTodasLasPosiciones(id1, id2) {
  const [rr, ri, ir, ii] = await Promise.all([
    buscarCombinacion(id1, id2, 'RR'),
    buscarCombinacion(id1, id2, 'RI'),
    buscarCombinacion(id1, id2, 'IR'),
    buscarCombinacion(id1, id2, 'II'),
  ]);
  return { RR: rr, RI: ri, IR: ir, II: ii };
}

/**
 * Calcula el código de posición a partir de las orientaciones de dos cartas.
 * R = Recta, I = Invertida. El orden es significativo: carta1 primero.
 *
 * @param {string} orient1 — "recta" | "invertida"
 * @param {string} orient2 — "recta" | "invertida"
 * @returns {string} — "RR" | "RI" | "IR" | "II"
 *
 * @example
 * getPosicionCombinacion('recta', 'invertida'); // → 'RI'
 */
export function getPosicionCombinacion(orient1, orient2) {
  const map = { recta: 'R', invertida: 'I' };
  return (map[orient1] || 'R') + (map[orient2] || 'R');
}
