/**
 * @file dom-nota.js
 * @description Nota corta de "rol estructural" por carta en Parte A —
 *   distinta para cada mazo porque el dato disponible es distinto.
 *
 *   Marsella: `dominancia` siempre nombra un arcano dominante ("Arcano
 *   dominante: LE BATELEUR..."). Se cuenta en cuántos de sus pares esta
 *   carta es la dominante.
 *
 *   RWS: `dominancia` casi siempre es "Equilibrio" (no hay arcano
 *   dominante numérico). En vez de repetir "Equilibrio" sin variar entre
 *   cartas (bug encontrado y corregido el 24/8/2026 — antes decía "En
 *   equilibrio con las otras dos" en las 3 cartas sin distinguirlas, y
 *   además dos versiones anteriores del texto tenían frases inventadas —
 *   "abre el camino", "pide paciencia" — que no salían de ningún campo
 *   real), se deriva la nota real comparando el `nivel_tension` de los
 *   pares de esta carta contra el máximo y el mínimo de tensión de toda
 *   la tirada. Empates en el máximo se nombran explícitamente, nunca se
 *   elige un "ganador" arbitrario entre pares empatados.
 *
 * @exports notaDominanciaMarsella, notaDominanciaRWS
 */

function _nombreDominante(textoDominancia) {
  const m = String(textoDominancia || '').match(/Arcano dominante:\s*([^.]+)\./i);
  return m ? m[1].trim() : null;
}

/**
 * @param {string} nombreCartaEs — arcano_es de la carta actual, en mayúsculas
 *   (tal cual aparece en cartas.json)
 * @param {Array<{ otraCarta: string, dominancia: string }>} susPares — los
 *   pares donde participa esta carta, cada uno con el texto de dominancia
 * @returns {string}
 */
export function notaDominanciaMarsella(nombreCartaEs, susPares) {
  const dominaEnEstos = susPares.filter(p => _nombreDominante(p.dominancia) === nombreCartaEs);

  if (dominaEnEstos.length === susPares.length && susPares.length > 0) {
    return susPares.length === 1
      ? `Domina esta combinación frente a ${susPares[0].otraCarta}.`
      : `Domina las ${susPares.length} combinaciones en las que participa.`;
  }
  if (dominaEnEstos.length > 0) {
    const nombres = dominaEnEstos.map(p => p.otraCarta).join(' y ');
    return `Domina frente a ${nombres}, pero no en el resto de sus combinaciones.`;
  }
  const dominantes = susPares.map(p => _nombreDominante(p.dominancia)).filter(Boolean);
  const unicos = [...new Set(dominantes)];
  return unicos.length === 1
    ? `No domina ninguna de sus combinaciones — ${unicos[0]} marca el tono en ambas.`
    : `No domina ninguna de sus combinaciones frente a ${unicos.join(' ni ')}.`;
}

/**
 * @param {number} idCarta
 * @param {Array<{ idOtraCarta: number, nombreOtraCarta: string, nivelTension: number }>} susPares
 * @param {number} tensionMaxTirada
 * @param {number} tensionMinTirada
 * @returns {string}
 */
export function notaDominanciaRWS(susPares, tensionMaxTirada, tensionMinTirada) {
  const apertura = 'Equilibrio estructural.';

  const enMax = susPares.filter(p => p.nivelTension === tensionMaxTirada);
  const enMin = susPares.filter(p => p.nivelTension === tensionMinTirada);
  const hayRangoReal = tensionMaxTirada > tensionMinTirada;

  if (enMax.length === susPares.length && susPares.length > 1 && hayRangoReal) {
    return `${apertura} Concentra la mayor tensión de la tirada en sus ${susPares.length} combinaciones — es la carta más tensionada de esta lectura.`;
  }

  const partes = [];
  if (hayRangoReal && enMax.length > 0) {
    const otrosPares = susPares.filter(p => p.nivelTension === tensionMaxTirada);
    // Nombrar la contraparte de este mismo empate en el resto de la tirada
    // (informativo — el llamador puede pasar el nombre de la otra carta ya
    // resuelto por par).
    const nombres = otrosPares.map(p => p.nombreOtraCarta).join(' y ');
    partes.push(`empata en la tensión más alta de la tirada (con ${nombres})`);
  }
  if (hayRangoReal && enMin.length > 0) {
    const nombres = enMin.map(p => p.nombreOtraCarta).join(' y ');
    partes.push(`tiene el par más armónico (con ${nombres})`);
  }

  if (partes.length === 0) return apertura;
  return `${apertura} ${partes.join(' y también ')}.`.replace('. e', '. E');
}
