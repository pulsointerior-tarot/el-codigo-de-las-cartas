/**
 * @file max-combinaciones.js
 * @description Con 4+ cartas en la tirada hay más de 5 pares posibles
 *   (6 con 4 cartas, hasta 66 con 12). Se muestran máximo 5 en
 *   "Combinaciones de esta tirada" — el resto queda accesible desde
 *   "Explorar todas las combinaciones".
 *
 *   RWS tiene `nivel_tension` numérico (1-5): se ordena directo por eso.
 *
 *   Marsella no tiene ningún campo numérico de intensidad — solo `tipo`
 *   binario (Resonancia/Tensión, verificado: 1367 vs 480 casos en el
 *   dataset completo). Se probó usar "cercanía en la tirada" (diferencia
 *   entre números de posición, ej. C1-C2 vs C1-C5) como desempate, pero
 *   se descartó: la mayoría de las tiradas de 4-6 cartas NO son lineales
 *   (cuadrado, cruz), así que el número de posición no refleja cercanía
 *   real sin datos de coordenadas que no existen. Desempate final: orden
 *   natural de generación de pares (C1-C2, C1-C3, C1-C4, C2-C3...).
 *
 * @exports elegirTop5Marsella, elegirTop5RWS
 */

/**
 * @param {Array<object>} pares — cada uno con { tipo, ...resto }, en el
 *   orden natural en que getTodosLosPares() ya los genera
 * @returns {Array<object>} máximo 5, mismos objetos de entrada
 */
export function elegirTop5Marsella(pares) {
  if (pares.length <= 5) return pares;
  const conIndice = pares.map((p, i) => ({ p, i, esTension: /^Tensión/i.test(p.tipo || p.combinacion?.tipo || '') }));
  conIndice.sort((a, b) => {
    if (a.esTension !== b.esTension) return a.esTension ? -1 : 1; // Tensión primero
    return a.i - b.i; // desempate: orden natural de generación
  });
  return conIndice.slice(0, 5).map(x => x.p);
}

/**
 * @param {Array<object>} pares — cada uno con { nivel_tension, ...resto }
 *   (o { combinacion: { nivel_tension } })
 * @returns {Array<object>} máximo 5
 */
export function elegirTop5RWS(pares) {
  if (pares.length <= 5) return pares;
  const nivel = (p) => {
    const raw = p.nivel_tension ?? p.combinacion?.nivel_tension ?? '0';
    return parseInt(String(raw).split(' ')[0], 10) || 0;
  };
  const conIndice = pares.map((p, i) => ({ p, i, n: nivel(p) }));
  conIndice.sort((a, b) => {
    if (a.n !== b.n) return b.n - a.n; // mayor tensión primero
    return a.i - b.i; // desempate: orden natural de generación
  });
  return conIndice.slice(0, 5).map(x => x.p);
}
