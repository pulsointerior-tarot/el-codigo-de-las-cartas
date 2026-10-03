/**
 * @file fusion-sinonimos.js
 * @description Motor compartido (Marsella + RWS) para fusionar 2-3 textos
 *   libres (comb_momento, comb_alerta, comb_consejos/comb_consejo,
 *   comb_habilidad, comb_evolucion, interpretacion) en una sola frase de
 *   consenso o de divergencia honesta — en vez de mostrar los textos
 *   sueltos o inventar un punto en común que el dato no sostiene.
 *
 *   Definido y verificado contra datos reales el 24/8/2026: probado
 *   primero con coincidencia de subcadena simple (dio falsos positivos —
 *   "SABIDURÍA" activaba con "conciencia", "METODOLOGÍA" con "informada"),
 *   corregido a límite de palabra (\b), y ajustado con umbral variable
 *   según el largo del campo (campos cortos exigen consenso en TODOS los
 *   textos; campos largos, que disparan muchas más categorías por el
 *   ruido natural del texto largo, exigen solo mayoría — 2 de 3).
 *
 * @exports detectarConceptos, fusionarTextos
 */

// Categorías que aparecen por razones estructurales del texto (siempre
// hablamos de "una carta", "un momento") y no aportan señal temática real.
// Lista inicial verificada contra 3 pares reales el 24/8/2026 — ampliar
// con más pruebas reales antes de considerarla definitiva.
const LISTA_NEGRA = new Set(['CARTA']);

// Umbral de largo (caracteres) que separa "campo corto" de "campo largo".
// comb_momento/comb_si_no reales rondan 60-150 caracteres; comb_alerta,
// comb_consejos, comb_habilidad, interpretacion, comb_evolucion rondan
// 150-400. 150 es el punto de corte verificado el 24/8/2026.
const UMBRAL_CAMPO_CORTO = 150;

/**
 * Detecta qué categorías del diccionario de sinónimos aparecen en un texto,
 * con coincidencia de límite de palabra (evita falsos positivos por
 * subcadena, ej. "ciencia" dentro de "conciencia").
 *
 * @param {string} texto
 * @param {object} sinonimos — objeto {CATEGORIA: [sinonimo, ...]}, tal
 *   cual lo devuelve getSinonimos() de data-marsella.js / data-rws.js
 * @returns {Set<string>} categorías detectadas, sin las de la lista negra
 */
export function detectarConceptos(texto, sinonimos) {
  const t = String(texto || '').toLowerCase();
  const encontrados = new Set();
  for (const [categoria, listaSinonimos] of Object.entries(sinonimos)) {
    if (LISTA_NEGRA.has(categoria)) continue;
    const palabras = [categoria.toLowerCase(), ...listaSinonimos.map(s => s.toLowerCase())];
    for (const p of palabras) {
      // \b requiere límite de palabra en ambos extremos — "ciencia" no
      // matchea dentro de "conciencia" (ahí el límite izquierdo falla).
      const re = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(t)) {
        encontrados.add(categoria);
        break;
      }
    }
  }
  return encontrados;
}

/**
 * Fusiona 2-3 textos libres en una frase de consenso o de divergencia,
 * usando el diccionario de sinónimos como detector de tema compartido.
 *
 * @param {Array<string>} textos — 2 o 3 textos a fusionar
 * @param {object} sinonimos
 * @param {object} [opciones]
 * @param {string} [opciones.plantillaConsenso] — recibe {concepto} → frase.
 *   Por defecto: "coinciden en torno a {concepto}"
 * @param {string} [opciones.plantillaDivergencia] — recibe {conceptos: string[]}
 *   (uno por texto, o null si ese texto no disparó ninguna categoría) →
 *   frase. Por defecto: lista los conceptos separados por coma.
 * @returns {{ tipo: 'consenso'|'divergencia', conceptos: string[], texto: string }}
 */
export function fusionarTextos(textos, sinonimos, opciones = {}) {
  const largoPromedio = textos.reduce((a, t) => a + String(t || '').length, 0) / textos.length;
  // Corregido 25/8/2026: el umbral fijo "exigir en TODOS" para campos
  // cortos funcionaba con 3 pares (probado con el caso La Papesse) pero
  // no escala — con 6 pares, un concepto presente en 5 de 6 (consenso
  // real, verificado con datos reales de "El Amor Incondicional") no
  // llegaba al 6 de 6 exigido y cayó en la rama de divergencia,
  // repitiendo el mismo concepto varias veces como si no coincidiera.
  // Ahora el umbral escala con la cantidad de textos: 80% para campos
  // cortos, 2/3 para campos largos — con 3 pares da el mismo resultado
  // que antes (ambos redondean a "los 3"), con 6+ ya no se rompe.
  const proporcion = largoPromedio < UMBRAL_CAMPO_CORTO ? 0.8 : 2 / 3;
  const umbralMinimo = Math.ceil(textos.length * proporcion);

  const sets = textos.map(t => detectarConceptos(t, sinonimos));
  const conteo = new Map();
  for (const s of sets) {
    for (const cat of s) {
      conteo.set(cat, (conteo.get(cat) || 0) + 1);
    }
  }

  const consenso = [...conteo.entries()]
    .filter(([, n]) => n >= umbralMinimo)
    .map(([cat]) => cat);

  if (consenso.length > 0) {
    const concepto = consenso[0].toLowerCase();
    const plantilla = opciones.plantillaConsenso
      || ((c) => `coinciden en torno a un mismo eje: ${c}`);
    return { tipo: 'consenso', conceptos: consenso, texto: plantilla(concepto) };
  }

  // Sin consenso: divergencia honesta — un concepto representativo por texto
  const porTexto = sets.map(s => [...s][0]?.toLowerCase() || null);
  const plantillaDiv = opciones.plantillaDivergencia
    || ((cs) => {
      const validos = cs.filter(Boolean);
      return validos.length
        ? `no coinciden entre sí: ${validos.join(', ')}`
        : 'no muestran un patrón común identificable';
    });
  return { tipo: 'divergencia', conceptos: porTexto, texto: plantillaDiv(porTexto) };
}
