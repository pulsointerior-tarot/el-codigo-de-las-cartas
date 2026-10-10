/**
 * @file veredicto-rws.js
 * @description Reemplaza a resultado-rws.js. Mismo orden que Marsella +
 *   Parte C exclusiva de RWS (energía y elementos). Diferencias de campo
 *   respetadas: `comb_consejo` (singular, no `comb_consejos`), `dinamica`
 *   para Armonía/Tensión/Complementariedad/Paradoja (NO `tipo`, que en
 *   RWS es la categoría de arcano — bug encontrado y corregido el
 *   24/8/2026 también en combinations-rws.js), `caracteristicas_recta`/
 *   `_inv` (separado por orientación, a diferencia de Marsella).
 *
 * @nota_de_alcance ver la misma nota en veredicto-marsella.js — Respuesta
 *   es una primera pasada razonable, no verificada con el mismo rigor que
 *   Parte A/B/C.
 */

import { getTiradaById, getPosicionesByTirada, getCartaById, getSinonimos, getTipoVeredicto } from './js/data-rws.js';
import { generarLecturaCompleta } from './js/sintesis-ia.js';
import { mapearTemaAColumna } from './js/readings-rws.js';
import { getCombinacionDirecta, renderFilaResumenCombinacion } from './js/combinations-rws.js';
import { getNombreCompleto, renderPlaceholderCarta } from './js/card-helpers.js';
import { renderEncabezadoPosicion } from './nuevo-formulario.js';
import { renderFormularioConsulta, conectarFormularioConsulta, mostrarEstadoVistas } from './nuevo-formulario.js';
import { getMazo, getTiradaActual } from './js/navigation.js';
import { fusionarTextos } from './js/fusion-sinonimos.js';
import { fusionarTiempos } from './js/tiempo-fusion.js';
import { notaDominanciaRWS } from './js/dom-nota.js';
import { elegirTop5RWS } from './js/max-combinaciones.js';


function _esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/**
 * Para tiradas de 1 carta, `significado` en posiciones.json no es una
 * etiqueta de posición limpia — es una lista condicional por nombre de
 * arcano (ej. "• Estrella, Sol, Sacerdotisa: SÍ... • Otras cartas: ...").
 * Bug encontrado el 25/8/2026: se estaba mostrando el bloque entero sin
 * resolver, generando una pared de texto. Se resuelve la rama que
 * corresponde a la carta real, con "Otras cartas" como resguardo, y el
 * texto completo como último recurso si el formato no es el esperado.
 */
function _resolverTextoPosicion(entry, nombreCartaEs, esUnaCarta) {
  if (!esUnaCarta) return entry?.significado || '';
  const texto = entry?.significado || '';
  if (!texto.includes('•')) return texto;
  const ramas = texto.split('•').map(s => s.trim()).filter(Boolean);
  let deOtras = '';
  for (const rama of ramas) {
    const idx = rama.indexOf(':');
    if (idx === -1) continue;
    const nombres = rama.slice(0, idx);
    const resto = rama.slice(idx + 1).trim();
    if (/otras cartas/i.test(nombres)) { deOtras = resto; continue; }
    if (nombreCartaEs && nombres.toLowerCase().includes(nombreCartaEs.toLowerCase())) return resto;
  }
  return deOtras || texto;
}

/**
 * Corregido 25/8/2026: este proyecto usa localStorage (`tirada_actual`),
 * no query params — mismo bug y misma corrección que en veredicto-marsella.js.
 */
function _leerTiradaActual() {
  const tirada = getTiradaActual();
  if (!tirada) return null;
  return {
    idTirada: tirada.id_tirada,
    tema: tirada.tema,
    nombreTirada: tirada.nombre,
    cartasSeleccion: tirada.cartas,
  };
}

async function _cargarCartasCompletas(seleccion) {
  return Promise.all(seleccion.map(async (s) => {
    const carta = await getCartaById(s.id);
    return { ...carta, orientacion: s.orientacion, idSeleccion: s.id, posicionCodigo: s.posicion };
  }));
}

function _resolverPosiciones(cartas, posicionesTirada) {
  const porCodigo = new Map(posicionesTirada.map(p => [p.posicion, p]));
  return cartas.map(c => porCodigo.get(c.posicionCodigo) || { posicion: c.posicionCodigo || '', significado: '' });
}

function _paresUnicos(cartas) {
  const pares = [];
  for (let i = 0; i < cartas.length; i++) {
    for (let j = i + 1; j < cartas.length; j++) {
      pares.push({ carta1: cartas[i], carta2: cartas[j] });
    }
  }
  return pares;
}

function _nivelTension(comb) {
  return parseInt(String(comb?.nivel_tension || '0').split(' ')[0], 10) || 0;
}

// ── TIRA DE CARTAS ──────────────────────────────────────────────────────

function _renderTiraDeCartas(cartas, posicionesPorId) {
  return `
    <div class="tira-cartas">
      ${cartas.map((c, i) => `
        <div class="tira-cartas__item">
          <span class="tira-cartas__posicion">${_esc(posicionesPorId[i]?.posicion || `C${i + 1}`)}</span>
          <div class="tira-cartas__carta">${renderPlaceholderCarta(c, getMazo(), 'medium', c.orientacion)}</div>
          <span class="tira-cartas__nombre">${_esc(getNombreCompleto(c))}</span>
          <span class="badge-orientacion ${c.orientacion === 'invertida' ? 'badge-invertida' : 'badge-recta'}">
            ${c.orientacion === 'invertida' ? '↓ INVERTIDA' : '↑ RECTA'}
          </span>
        </div>
      `).join('')}
    </div>`;
}

// ── RESPUESTA ────────────────────────────────────────────────────────────

function _respuestaCortaCarta(carta) {
  return carta.orientacion === 'invertida' ? carta.respuesta_corta_inv : carta.respuesta_corta_recta;
}

function _sentidoRespuesta(texto) {
  const t = String(texto || '').trim().toLowerCase();
  if (t.startsWith('sí') || t.startsWith('si')) return 'si';
  if (t.startsWith('no')) return 'no';
  return 'depende';
}

/**
 * Rol de una posición dentro de una tirada 'binario': qué representa un
 * "sí" de esa carta respecto de la pregunta real de la tirada.
 *   - descriptiva: no responde a la pregunta, no vota.
 *   - a_favor / resolutiva: un "sí" de la carta es un "sí" a la pregunta.
 *   - en_contra: la posición pregunta "¿de qué me arrepentiría SI elijo
 *     esta opción?" — ahí un "sí" de la carta es una señal de alerta, y
 *     por tanto un voto en el sentido CONTRARIO al de la carta.
 * Ver corrección del 22/9/2026: antes se sumaban las 4 cartas de una
 * tirada como votos equivalentes sin mirar qué pregunta respondía cada
 * posición, lo que en tiradas como "Decisión y Arrepentimiento" invertía
 * el resultado. data/rws/tipos-veredicto.json guarda esta clasificación
 * por tirada; getTipoVeredicto() devuelve 'sin_veredicto' por defecto
 * para cualquier tirada de más de una carta que no esté ahí.
 */
function _rolPosicion(tipoVeredicto, carta) {
  if (tipoVeredicto.tipo_veredicto !== 'binario') return null;
  return tipoVeredicto.posiciones?.[carta.posicionCodigo] || 'descriptiva';
}

const _ETIQUETA_ROL = {
  a_favor: ' (a favor del sí)',
  en_contra: ' (cuenta en contra del sí)',
  resolutiva: ' (posición resolutiva)',
};

function _listaCartas(cartas, tipoVeredicto = null) {
  return cartas.map(c => {
    const nombre = getNombreCompleto(c).split('—').pop().trim();
    const rol = tipoVeredicto ? _rolPosicion(tipoVeredicto, c) : null;
    const etiqueta = _ETIQUETA_ROL[rol] || '';
    return `<li><strong>${_esc(nombre)}${etiqueta}:</strong> ${_esc(_respuestaCortaCarta(c))}</li>`;
  }).join('');
}

function _cierreTension(pares) {
  const combs = pares.map(p => p.combinacion).filter(Boolean);
  if (combs.length === 0) return '';
  // Tensión máxima de la tirada, con empates nombrados explícitamente
  // (regla definida el 24/8/2026 — nunca se elige un "ganador" arbitrario)
  const maxT = Math.max(...pares.filter(p => p.combinacion).map(p => _nivelTension(p.combinacion)));
  const enMax = pares.filter(p => p.combinacion && _nivelTension(p.combinacion) === maxT);
  if (enMax.length === 1) {
    const p = enMax[0];
    return `El nudo más tenso de la tirada está entre ${getNombreCompleto(p.carta1)} y ${getNombreCompleto(p.carta2)}.`;
  }
  const nombres = enMax.map(p => `${getNombreCompleto(p.carta1)} + ${getNombreCompleto(p.carta2)}`).join(' y ');
  return `El nudo más tenso de la tirada se reparte entre pares empatados: ${nombres}.`;
}

/**
 * Calcula la apertura de sí/no (o su equivalente en tiradas sin sí/no)
 * respetando _rolPosicion. Compartida entre la Vista de estudio
 * (_renderRespuesta) y la Vista de lectura (_renderVistaLectura) — antes
 * cada una tenía su propio conteo ciego, y podían llegar a decir cosas
 * distintas entre sí para la misma tirada. Corrección del 22/9/2026.
 */
function _calcularApertura(tipoVeredicto, cartas) {
  const tipo = tipoVeredicto.tipo_veredicto;

  if (tipo === 'sin_veredicto') {
    return 'Esta tirada es exploratoria: no da un sí o un no, orienta sobre la situación.';
  }
  if (tipo === 'eleccion_ab') {
    return 'Esta tirada compara dos caminos, no pregunta sí o no — leé cada posición para ver hacia qué lado se inclina el conjunto.';
  }
  if (tipo === 'directa' || tipo === 'resolutiva_unica') {
    const cartaResolutiva = tipo === 'directa'
      ? cartas[0]
      : (cartas.find(c => c.posicionCodigo === tipoVeredicto.posicion_resolutiva) || cartas[cartas.length - 1]);
    const nombreResolutiva = getNombreCompleto(cartaResolutiva).split('—').pop().trim();
    return `La respuesta directa está en ${nombreResolutiva}: ${_respuestaCortaCarta(cartaResolutiva)}`;
  }

  // binario
  const votos = cartas
    .map(c => {
      const rol = _rolPosicion(tipoVeredicto, c);
      if (rol === 'descriptiva') return null;
      let sentido = _sentidoRespuesta(_respuestaCortaCarta(c));
      if (rol === 'en_contra' && sentido !== 'depende') sentido = sentido === 'si' ? 'no' : 'si';
      return sentido;
    })
    .filter(Boolean);
  const conteoSi = votos.filter(s => s === 'si').length;
  const conteoNo = votos.filter(s => s === 'no').length;
  const totalVotos = votos.length;

  if (totalVotos === 0) {
    return 'Ninguna posición de esta tirada se inclina con claridad a un lado — la respuesta es reservada.';
  }
  if (conteoSi === totalVotos) {
    return 'Las posiciones que responden directamente a la pregunta coinciden: la respuesta es sí, con matices.';
  }
  if (conteoNo === totalVotos) {
    return 'Las posiciones que responden directamente a la pregunta coinciden: la respuesta es no.';
  }
  if (conteoSi === 0 && conteoNo === 0) {
    return 'Las posiciones que responden a la pregunta dan una respuesta reservada, sin inclinarse claramente a un lado.';
  }
  return `${conteoSi} de las ${totalVotos} posiciones que responden a la pregunta se inclinan por el sí; ${conteoNo === 1 ? 'una' : conteoNo} por el no.`;
}

async function _renderRespuesta(tirada, cartas, pares) {
  const tipoVeredicto = await getTipoVeredicto(tirada.id_tirada, cartas.length);
  const tipo = tipoVeredicto.tipo_veredicto;
  const apertura = _calcularApertura(tipoVeredicto, cartas);
  const cierreTension = _cierreTension(pares);
  const cierreHtml = cierreTension ? `<p class="respuesta__cierre">${_esc(cierreTension)}</p>` : '';

  // Tirada exploratoria o de comparación A/B: forzar un sí/no aquí sería
  // responder una pregunta que la tirada no hace. Se muestra cada carta
  // con su propia lectura, sin conteo.
  if (tipo === 'sin_veredicto' || tipo === 'eleccion_ab') {
    return `
      <section class="bloque-respuesta">
        <p class="respuesta__apertura"><strong>${_esc(apertura)}</strong></p>
        <ul class="respuesta__desarrollo" id="respuesta-lista">${_listaCartas(cartas)}</ul>
        ${cierreHtml}
      </section>`;
  }

  // Una sola carta ('directa'), o una tirada con una única posición que
  // resuelve la pregunta ('resolutiva_unica'): la respuesta sale de esa
  // carta sola. Las demás no votan porque no responden a la pregunta,
  // describen el contexto.
  if (tipo === 'directa' || tipo === 'resolutiva_unica') {
    const cartaResolutiva = tipo === 'directa'
      ? cartas[0]
      : (cartas.find(c => c.posicionCodigo === tipoVeredicto.posicion_resolutiva) || cartas[cartas.length - 1]);
    const otras = cartas.filter(c => c !== cartaResolutiva);
    return `
      <section class="bloque-respuesta">
        <p class="respuesta__apertura"><strong>${_esc(apertura)}</strong></p>
        ${otras.length ? `<ul class="respuesta__desarrollo" id="respuesta-lista">${_listaCartas(otras)}</ul>` : ''}
        ${cierreHtml}
      </section>`;
  }

  // tipo === 'binario': el único caso donde de verdad se cuenta — y se
  // cuenta respetando el rol de cada posición, no el texto de la carta a
  // secas. Ver _rolPosicion y _calcularApertura arriba.
  return `
    <section class="bloque-respuesta">
      <p class="respuesta__apertura"><strong>${_esc(apertura)}</strong></p>
      <ul class="respuesta__desarrollo" id="respuesta-lista">${_listaCartas(cartas, tipoVeredicto)}</ul>
      ${cierreHtml}
    </section>`;
}

// ── PARTE A: RECORRIDO POR POSICIONES ────────────────────────────────────

// FUSIONADO 18/9/2026, a pedido de la usuaria: esta sección y "Cartas de
// esta tirada" repetían, literalmente, nombre + orientación + posición de
// cada carta (misma llamada a _resolverTextoPosicion) y después cada una
// agregaba solo 2-3 datos propios. Se fusionan en un solo bloque por
// carta — nombre/posición una sola vez, todos los campos de la carta
// juntos. "Alerta" y "Próximo paso" de acá son SOLO de esta carta
// (alerta_recta/inv, proximo_paso_recta/inv) — se etiquetan "de esta
// carta" porque Parte B, más abajo, ya trae su propia Alerta y Próximo
// paso fusionados entre TODOS los pares de la tirada (comb_alerta,
// comb_proximo_paso) — son dos datos reales y distintos, no el mismo
// repetido, pero conviven en la misma página y necesitan quedar claros.
/**
 * Algunos campos siguen el patrón normal `${base}_recta` / `${base}_inv`;
 * uno (actividades_sugeridas) guarda la versión recta sin sufijo. Este
 * helper prueba el campo sufijado y si no existe cae al campo base, para
 * no tener que hardcodear la excepción en cada lugar donde se usa.
 */
function _campoOrientado(carta, base, suf) {
  const key = `${base}${suf}`;
  if (Object.prototype.hasOwnProperty.call(carta, key)) return carta[key] || '';
  return carta[base] || '';
}

function _bloqueDetalle(titulo, filas) {
  const contenido = filas.filter(f => f.valor).map(f =>
    `<p><strong>${_esc(f.etiqueta)}:</strong> ${_esc(f.valor)}</p>`
  ).join('');
  if (!contenido) return '';
  return `
    <details class="parte-a__detalle" open>
      <summary>${_esc(titulo)}</summary>
      ${contenido}
    </details>`;
}

function _renderParteA(cartas, posicionesPorId, pares, tema) {
  const combs = pares.map(p => p.combinacion).filter(Boolean);
  const tensionMax = combs.length ? Math.max(...combs.map(_nivelTension)) : 0;
  const tensionMin = combs.length ? Math.min(...combs.map(_nivelTension)) : 0;
  const columnaTema = mapearTemaAColumna(tema);

  const filas = cartas.map((carta, i) => {
    const susPares = pares
      .filter(p => (p.carta1 === carta || p.carta2 === carta) && p.combinacion)
      .map(p => {
        const otra = p.carta1 === carta ? p.carta2 : p.carta1;
        return { nombreOtraCarta: getNombreCompleto(otra), nivelTension: _nivelTension(p.combinacion) };
      });
    const domNota = susPares.length ? notaDominanciaRWS(susPares, tensionMax, tensionMin) : '';
    const inv = carta.orientacion === 'invertida';
    const suf = inv ? '_inv' : '_recta';

    const claves = _primerasNPalabras(carta[`palabras_clave${suf}`], 5);
    const campoTema = columnaTema ? `${columnaTema}${suf}` : null;
    const interpretacionTema = (campoTema ? carta[campoTema] : '') || '';

    // Bloques nuevos (22/9/2026): antes estos campos ya estaban cargados
    // en memoria pero no se mostraban en ningún lado — el consultante
    // tenía que ir a arcanos.html a buscarlos. Van en <details open>: se
    // ven abiertos por defecto para lectura corrida, pero se pueden
    // plegar si la página queda muy larga.
    const bloqueEsencia = _bloqueDetalle('Esencia y personalidad', [
      { etiqueta: 'Esencia', valor: _campoOrientado(carta, 'esencia', suf) },
      { etiqueta: 'Personalidad', valor: _campoOrientado(carta, 'aspectos_personalidad', suf) },
      { etiqueta: 'Dinámica', valor: _campoOrientado(carta, 'dinamica', suf) },
      { etiqueta: 'Lugar asociado', valor: _campoOrientado(carta, 'lugar', suf) },
      { etiqueta: 'Actividades sugeridas', valor: _campoOrientado(carta, 'actividades_sugeridas', suf) },
    ]);

    const bloqueIconografia = _bloqueDetalle('Iconografía y símbolos', [
      { etiqueta: 'Descripción de la imagen', valor: carta.descripcion_iconografica },
      { etiqueta: 'Simbolismo', valor: carta.simbolismo },
      { etiqueta: 'Símbolos presentes', valor: carta.simbolos_iconograficos },
      { etiqueta: 'Aspecto físico (Golden Dawn)', valor: carta.aspecto_fisico_gd },
    ]);

    const bloqueMiradas = _bloqueDetalle('Mirada y tiempo', [
      { etiqueta: 'Dirección de la mirada', valor: carta.direccion_mirada },
      { etiqueta: 'Ley de miradas (tiempo)', valor: carta.ley_miradas_temporal },
      { etiqueta: 'Ritmo de esta carta', valor: carta.velocidad_carta },
      { etiqueta: '¿Marca un quiebre?', valor: carta.es_carta_quiebre },
    ]);

    const bloqueNumerologia = _bloqueDetalle('Numerología', [
      { etiqueta: 'Numerología universal', valor: carta.numerologia_universal },
      { etiqueta: 'El número en esta carta', valor: carta.relacion_numeral },
      { etiqueta: 'Relación con el palo', valor: carta.relacion_palo },
    ]);

    return `
      <article class="parte-a__carta">
        ${cartas.length > 1
          ? renderEncabezadoPosicion({
              codigo: carta.posicionCodigo || posicionesPorId[i]?.posicion || `C${i + 1}`,
              significado: _resolverTextoPosicion(posicionesPorId[i], carta.arcano_es, false),
              subtitulo: `${getNombreCompleto(carta)} — ${carta.orientacion}`,
              claseSub: 'parte-a__carta-nombre',
            })
          : `<h3>${_esc(getNombreCompleto(carta))} — ${carta.orientacion}</h3>
        <p class="parte-a__posicion">${_esc(_resolverTextoPosicion(posicionesPorId[i], carta.arcano_es, true))}</p>`}
        <p class="parte-a__caracteristicas">${_esc(carta[`caracteristicas${suf}`] || '')}</p>
        ${claves ? `<p class="parte-a__claves"><strong>Palabras clave:</strong> ${_esc(claves)}</p>` : ''}
        <p class="parte-a__tendencia"><strong>Tendencia:</strong> ${_esc(carta[`tendencia${suf}`] || '')}</p>
        <p class="parte-a__presencia"><strong>Presencia:</strong> ${_esc(carta[`presencia${suf}`] || '')}</p>
        ${interpretacionTema ? `<p class="parte-a__tema"><strong>En tu consulta sobre ${_esc(tema || 'esto')}:</strong> ${_esc(interpretacionTema)}</p>` : ''}
        <p class="parte-a__ritmo"><strong>Ritmo:</strong> ${_esc(carta[`tiempo${suf}`] || '')}</p>
        <p class="parte-a__alerta-carta"><strong>Punto ciego de esta carta:</strong> ${_esc(carta[`alerta${suf}`] || '')}</p>
        <p class="parte-a__proximo-carta"><strong>Próximo paso con esta carta:</strong> ${_esc(carta[`proximo_paso${suf}`] || '')}</p>
        ${domNota ? `<p class="parte-a__dom-nota">${_esc(domNota)}</p>` : ''}
        ${bloqueEsencia}
        ${bloqueIconografia}
        ${bloqueMiradas}
        ${bloqueNumerologia}
        <a href="arcanos.html?carta=${carta.slug}&desde=resultado">Ver ficha completa del arcano →</a>
      </article>`;
  }).join('');

  return `<section class="parte-a"><h2>A — Recorrido por posiciones</h2>${filas}</section>`;
}

// ── PARTE B: FUSIÓN DE COMBINACIONES ─────────────────────────────────────

/**
 * Arma el HTML de una caja tipo "Próximo paso"/"Alerta": si hay consenso
 * real entre los pares (mismo eje temático), lo destaca; si no, lista las
 * opciones sin fingir un consenso que el dato no sostiene — mismo criterio
 * que el resto de Parte B (ver fusion-sinonimos.js).
 */
function _cajaConsenso(textos, sinonimos, introConsenso, introDivergencia) {
  const unicos = [...new Set(textos.filter(Boolean))];
  if (unicos.length === 0) return '';
  if (unicos.length <= 2) {
    return `<p>${unicos.map(_esc).join(' ')}</p>`;
  }
  const fusion = fusionarTextos(unicos, sinonimos);
  if (fusion.tipo === 'consenso') {
    return `<p>${_esc(introConsenso)} <strong>${_esc(fusion.conceptos[0].toLowerCase())}</strong>: ${unicos.map(_esc).join(' ')}</p>`;
  }
  return `<p>${_esc(introDivergencia)}</p><ul>${unicos.slice(0, 3).map(t => `<li>${_esc(t)}</li>`).join('')}</ul>`;
}

async function _renderParteB(pares, sinonimos) {
  const combs = pares.map(p => p.combinacion).filter(Boolean);
  if (combs.length === 0) return '';

  // dinamica, NO tipo (bug corregido 24/8/2026) — 4 categorías posibles
  const combsClasificables = combs.filter(c => c.dinamica);
  const dinamicas = combsClasificables.map(c => (c.dinamica || '').split(':')[0].trim());
  const unicas = [...new Set(dinamicas)];
  const sinClasificar = combs.length - combsClasificables.length;
  let aperturaTipo;
  if (unicas.length === 0) {
    aperturaTipo = 'No hay clasificación de dinámica disponible para las combinaciones de esta tirada.';
  } else {
    aperturaTipo = unicas.length === 1
      ? `${sinClasificar === 0 ? 'Las' : `De las ${combsClasificables.length} combinaciones con clasificación disponible, las`} son de <strong>${_esc(unicas[0])}</strong>.`
      : `De las combinaciones con clasificación disponible, se reparten: ${unicas.map(u => `${dinamicas.filter(x => x === u).length} de ${u}`).join(', ')}.`;
    if (sinClasificar > 0) aperturaTipo += ` (${sinClasificar} ${sinClasificar === 1 ? 'combinación no tiene' : 'combinaciones no tienen'} esta clasificación.)`;
  }

  const momento = fusionarTextos(combs.map(c => c.comb_momento), sinonimos);
  const evolucion = fusionarTextos(combs.map(c => c.comb_evolucion), sinonimos);
  const consejo = fusionarTextos(combs.map(c => c.comb_consejo), sinonimos);
  const habilidad = fusionarTextos(combs.map(c => c.comb_habilidad), sinonimos);
  const tiempoFrase = fusionarTiempos(combs.map(c => c.comb_tiempo), 'rws');

  const parrafo = `<p>${aperturaTipo} ${_esc(`En conjunto, ${momento.texto}.`)}
    ${_esc(`Sobre cómo evolucionar, ${evolucion.texto}.`)} ${_esc(tiempoFrase)}
    ${_esc(`Sobre el consejo, ${consejo.texto}.`)} ${_esc(`Sobre la habilidad que piden estas cartas, ${habilidad.texto}.`)}</p>`;

  // comb_consejo (singular en RWS) — mismo patrón para ambas cajas
  // Corregido 25/8/2026: mostraba solo pares[0], ignorando el resto de
  // los pares (bug real encontrado con una tirada de 4 cartas / 6 pares —
  // solo se veía el próximo paso de 1 de los 6). Con 1-2 pares alcanza
  // con mostrarlos directo; con 3+ se intenta fusión por consenso, y si
  // no hay consenso real se listan como opciones en vez de fingir una
  // sola frase.
  const proximoPasoHtml = _cajaConsenso(
    combs.map(c => c.comb_proximo_paso), sinonimos,
    'El paso en común entre los pares de esta tirada gira en torno a',
    'No hay un único paso que aplique a toda la tirada — elegí el que más resuene:'
  );
  const alertaHtml = _cajaConsenso(
    combs.map(c => c.comb_alerta), sinonimos,
    'La alerta que comparten los pares de esta tirada gira en torno a',
    'No hay una única alerta que aplique a toda la tirada — tené en cuenta todas:'
  );
  // Severidad real: solo se muestra con tono de alarma (rojo) si al menos
  // un par es genuinamente negativo Y de tensión alta (≥4/5) — no solo
  // "desafiante" (que puede ser crecimiento, no problema). Verificado con
  // ~22.000 combinaciones reales: con este criterio, la caja roja aparece
  // en ~45-55% de las tiradas típicas de 3-4 cartas, no en el 100% (antes
  // de este cambio, comb_alerta está poblado en TODAS las combinaciones,
  // así que sin este filtro la caja roja salía siempre, sin distinguir
  // una tirada realmente tensa de una en paz — decisión tomada con la
  // usuaria el 11/9/2026).
  const esAlertaSeria = combs.some(c => {
    const valencia = (c.valencia_combinacion || '').split(':')[0].trim();
    return valencia === 'Negativa' && _nivelTension(c) >= 4;
  });

  // Lectura de cada par, en su propio texto completo — antes este campo
  // (interpretacion) solo se veía en detalle-combinacion-rws.html, una
  // página aparte a la que había que navegar. Se limita a los mismos 5
  // pares que ya elige elegirTop5RWS para el resto de la tirada, no los
  // pares completos: con 10 cartas son 45 pares, y mostrar el texto largo
  // de los 45 vuelve la página inmanejable.
  const paresConCombinacion = pares.filter(p => p.combinacion);
  const top5ParaInterpretacion = elegirTop5RWS(
    paresConCombinacion.map(p => ({ ...p, nivel_tension: p.combinacion.nivel_tension }))
  );
  const interpretacionesHtml = top5ParaInterpretacion
    .filter(p => p.combinacion.interpretacion)
    .map(p => `
      <details class="parte-b__interpretacion" open>
        <summary>${_esc(getNombreCompleto(p.carta1))} + ${_esc(getNombreCompleto(p.carta2))}</summary>
        <p>${_esc(p.combinacion.interpretacion)}</p>
      </details>`).join('');
  const bloqueInterpretaciones = interpretacionesHtml
    ? `<div class="parte-b__interpretaciones">
        <h3>Lectura de cada par</h3>
        ${interpretacionesHtml}
        ${paresConCombinacion.length > 5 ? `<p class="ver-todas"><a href="combinaciones-rws.html">Ver la interpretación de todos los pares →</a></p>` : ''}
      </div>`
    : '';

  return `
    <section class="parte-b">
      <h2>B — Lo que revelan, en conjunto, las combinaciones</h2>
      ${parrafo}
      <div class="alerta${esAlertaSeria ? '' : ' alerta--suave'}">
        <h3>${esAlertaSeria ? 'Alerta de la tirada' : 'Tené en cuenta (tirada completa)'}</h3>
        ${alertaHtml}
      </div>
      <div class="proximo-paso">
        <h3>Próximo paso de la tirada</h3>
        ${proximoPasoHtml}
      </div>
      ${bloqueInterpretaciones}
    </section>`;
}

// ── PARTE C: ENERGÍA Y ELEMENTOS (exclusiva RWS) ─────────────────────────

function _renderParteC(cartas, pares) {
  const combs = pares.map(p => p.combinacion).filter(Boolean);
  if (combs.length === 0) return '';

  // Bloqueo de energía: qué carta concentra "Bloqueada" en sus pares
  const bloqueoPorCarta = new Map(cartas.map(c => [c, 0]));
  for (const p of pares) {
    if (!p.combinacion) continue;
    if (p.combinacion.estado_energia_1 === 'Bloqueada') bloqueoPorCarta.set(p.carta1, (bloqueoPorCarta.get(p.carta1) || 0) + 1);
    if (p.combinacion.estado_energia_2 === 'Bloqueada') bloqueoPorCarta.set(p.carta2, (bloqueoPorCarta.get(p.carta2) || 0) + 1);
  }
  const cartaMasBloqueada = [...bloqueoPorCarta.entries()].sort((a, b) => b[1] - a[1])[0];
  const fraseEnergia = cartaMasBloqueada && cartaMasBloqueada[1] > 0
    ? `El bloqueo de energía se concentra en ${getNombreCompleto(cartaMasBloqueada[0])}. Las demás cartas se expresan con libertad en los pares donde participan.`
    : 'Ninguna carta llega con su energía bloqueada en esta tirada.';

  // Elemento: pares con amplificación real (mismo elemento)
  const amplificados = pares.filter(p => p.combinacion?.relacion_elemental === 'Mismo_elemento');
  const fraseElemento = amplificados.length
    ? `Elementalmente, ${amplificados.map(p => `${getNombreCompleto(p.carta1)} y ${getNombreCompleto(p.carta2)}`).join(', ')} comparten el mismo elemento — amplificación real. El resto de las combinaciones son elementalmente neutrales entre sí.`
    : 'Ninguna combinación de esta tirada comparte elemento — no hay amplificación elemental directa.';

  // Barras de tensión con valores reales. Recolectamos, además, la frase
  // completa de valencia_combinacion (no solo la categoría) para armar la
  // leyenda de abajo con el propio texto del dato — sin inventar glosario.
  const valenciasUsadas = new Map(); // categoría -> definición completa
  const filasTension = pares.filter(p => p.combinacion).map(p => {
    const n = _nivelTension(p.combinacion);
    const valenciaCompleta = p.combinacion.valencia_combinacion || '';
    const [categoria, definicion] = valenciaCompleta.split(':').map(s => (s || '').trim());
    if (categoria && definicion) valenciasUsadas.set(categoria, definicion);
    return `
      <div class="tension-fila">
        <span>${_esc(getNombreCompleto(p.carta1))} + ${_esc(getNombreCompleto(p.carta2))}</span>
        <span class="tension-barra"><span style="width:${n * 20}%"></span></span>
        <span>${n}/5 · ${_esc(categoria)}</span>
      </div>`;
  }).join('');

  const leyendaValencia = valenciasUsadas.size ? `
    <dl class="leyenda-valencia">
      ${[...valenciasUsadas.entries()].map(([categoria, definicion]) => `
        <div class="leyenda-valencia__item">
          <dt>${_esc(categoria)}</dt>
          <dd>${_esc(definicion)}</dd>
        </div>`).join('')}
    </dl>` : '';

  // AÑADIDO 27/9/2026, a pedido de Kuka ("enseñar el máximo"): 14 campos
  // de combinación que tenían contenido real pero no se mostraban en
  // ningún lado. Limitado a los mismos 5 pares principales que ya usa
  // Parte B/Combinaciones — con 45 pares (10 cartas) sería inmanejable
  // mostrar el detalle completo de todos.
  const paresConCombinacion = pares.filter(p => p.combinacion);
  const top5Estructura = elegirTop5RWS(paresConCombinacion.map(p => ({ ...p, nivel_tension: p.combinacion.nivel_tension })));
  const bloquesEstructura = top5Estructura.map(p => {
    const c = p.combinacion;
    const fila = (etiqueta, valor) => valor ? `<p><strong>${_esc(etiqueta)}:</strong> ${_esc(valor)}</p>` : '';
    return `
      <details class="parte-c__detalle" open>
        <summary>${_esc(getNombreCompleto(p.carta1))} + ${_esc(getNombreCompleto(p.carta2))}</summary>
        <div class="parte-c__grupo">
          <h4>Numerología del par</h4>
          ${fila('Número compartido', c.numero_compartido)}
          ${fila('Suma reducida', c.suma_reducida != null ? String(c.suma_reducida) : '')}
        </div>
        <div class="parte-c__grupo">
          <h4>Estructura arquetípica</h4>
          ${fila('Peso arquetípico (arcano mayor)', c.arcano_mayor_numerico)}
          ${fila('Arcano de síntesis', c.arcano_sintesis)}
          ${fila('Relación de rango', c.relacion_rango)}
          ${fila('Relación de palos', c.relacion_palos)}
          ${fila('Relación entre figuras de corte', c.relacion_figura_menor)}
        </div>
        <div class="parte-c__grupo">
          <h4>Dinámica y ritmo</h4>
          ${fila('Dinámica elemental', c.dinamica_elemental)}
          ${fila('Tensión de polaridad', c.tension_polaridad)}
          ${fila('Refuerzo o debilidad', c.refuerzo_debilidad)}
          ${fila('Relación de inversión', c.relacion_inversion)}
          ${fila('Velocidad de la díada', c.velocidad_diada)}
          ${fila('¿Es punto de quiebre?', c.diada_quiebre)}
        </div>
        ${c.dialogo_miradas ? `<div class="parte-c__grupo"><h4>Miradas</h4>${fila('Diálogo de miradas', c.dialogo_miradas)}</div>` : ''}
      </details>`;
  }).join('');

  return `
    <section class="parte-c">
      <h2>C — Energía y elementos</h2>
      <p>${_esc(fraseEnergia)} ${_esc(fraseElemento)}</p>
      <div class="tension-tabla">${filasTension}</div>
      ${leyendaValencia}
      ${bloquesEstructura ? `<h3>Estructura numerológica y arquetípica de cada par</h3>${bloquesEstructura}` : ''}
    </section>`;
}

// ── COMBINACIONES DE ESTA TIRADA (máx. 5) ─────────────────────────────────

function _renderCombinaciones(pares) {
  const paresConCombinacion = pares.filter(p => p.combinacion);
  if (paresConCombinacion.length === 0) return '';
  const top5 = elegirTop5RWS(paresConCombinacion.map(p => ({ ...p, nivel_tension: p.combinacion.nivel_tension })));

  const filas = top5.map(p => {
    // detalle-combinacion-rws.html lee id1/id2 (ver su init()); la posición
    // no viaja por URL porque esa página ya ofrece las 4 pestañas RR/RI/IR/II.
    const urlDetalle = `detalle-combinacion-rws.html?id1=${p.carta1.id}&id2=${p.carta2.id}`;
    return renderFilaResumenCombinacion(p.carta1, p.carta2, p.combinacion, urlDetalle);
  }).join('');

  return `
    <section class="combinaciones-tirada">
      <h2>Combinaciones de esta tirada</h2>
      ${filas}
      ${paresConCombinacion.length > 5 ? `<p class="ver-todas"><a href="combinaciones-rws.html">Explorar todas las combinaciones →</a></p>` : ''}
    </section>`;
}

// ── CARTAS DE ESTA TIRADA ─────────────────────────────────────────────────

function _primerasNPalabras(texto, n) {
  return String(texto || '').split(',').map(s => s.trim()).slice(0, n).join(' · ');
}

// ── ACCIONES ──────────────────────────────────────────────────────────────

function _renderAcciones() {
  return `
    <div class="acciones">
      <button id="btn-copiar" type="button" class="btn btn--outline"><i class="ph ph-copy" aria-hidden="true"></i> Copiar</button>
    </div>`;
}

// ── VISTA DE LECTURA (narrativa) ─────────────────────────────────────────
// Mismo dato, otra forma. No repite Parte A/B/C con letras ni tabla de
// tensión — arma prosa corrida con los mismos textos ya calculados
// (fusionarTextos, fusionarTiempos, _nivelTension). Pensada para quien
// quiere que le "hablen", no un informe. La vista de estudio (Parte
// A/B/C) sigue siendo la fuente completa — acá se resume, no se inventa
// nada que no esté en los mismos campos. Decisión con la usuaria el
// 11/9/2026.
/**
 * Arma, para cada carta, los datos que el Worker de Gemini necesita para
 * escribir esa posición sin inventar nada — mismos campos que ya carga
 * Parte A, solo reempaquetados.
 */
function _armarPayloadLecturaIA(cartas, posicionesPorId) {
  return cartas.map((carta, i) => {
    const suf = carta.orientacion === 'invertida' ? '_inv' : '_recta';
    return {
      posicion: carta.posicionCodigo || posicionesPorId[i]?.posicion || `C${i + 1}`,
      significado: posicionesPorId[i]?.significado || '',
      carta: getNombreCompleto(carta),
      orientacion: carta.orientacion,
      caracteristicas: carta[`caracteristicas${suf}`] || '',
      tendencia: carta[`tendencia${suf}`] || '',
      alerta: carta[`alerta${suf}`] || '',
      decisiones: carta[`decisiones${suf}`] || '',
    };
  });
}

/**
 * AÑADIDO 26/9/2026: antes el Worker solo veía cartas sueltas — la
 * "Síntesis" la inventaba mirando cada carta por separado, sin ver las
 * combinaciones entre pares que ya están escritas (más específicas que
 * lo que Gemini puede inferir solo). Se le mandan los mismos 5 pares
 * principales que ya elige elegirTop5RWS para el resto de la tirada —
 * no todos, para no inflar el pedido con tiradas de muchas cartas.
 * Campos elegidos a pedido de Kuka (26/9/2026): interpretacion,
 * comb_consejo, comb_tiempo, comb_proximo_paso, comb_alerta,
 * comb_momento, comb_habilidad, comb_evolucion.
 */
function _armarPayloadCombinacionesIA(pares) {
  const paresConCombinacion = pares.filter(p => p.combinacion);
  const top5 = elegirTop5RWS(
    paresConCombinacion.map(p => ({ ...p, nivel_tension: p.combinacion.nivel_tension }))
  );
  return top5.map(p => ({
    carta1: getNombreCompleto(p.carta1),
    carta2: getNombreCompleto(p.carta2),
    interpretacion: p.combinacion.interpretacion || '',
    consejo: p.combinacion.comb_consejo || '',
    tiempo: p.combinacion.comb_tiempo || '',
    proximoPaso: p.combinacion.comb_proximo_paso || '',
    alerta: p.combinacion.comb_alerta || '',
    momento: p.combinacion.comb_momento || '',
    habilidad: p.combinacion.comb_habilidad || '',
    evolucion: p.combinacion.comb_evolucion || '',
  }));
}

const _SUBTITULOS_LECTURA_IA = new Set(['Aspectos positivos', 'Aspectos a considerar', 'Síntesis', 'Mensaje final']);

/**
 * Convierte el texto plano que devuelve Gemini (ver el prompt en
 * cloudflare-worker/sintesis-respuesta.js) en HTML — reconoce los
 * subtítulos de posición ("C1 — Nombre de la carta"), los 4 subtítulos
 * fijos, y las viñetas ("- " o "• "); todo lo demás es párrafo.
 */
function _renderTextoLecturaIA(texto, codigosPosicion, significadosPorCodigo = new Map()) {
  const lineas = String(texto).split('\n').map(l => l.trim());
  let html = '';
  let listaAbierta = false;
  const cerrarLista = () => { if (listaAbierta) { html += '</ul>'; listaAbierta = false; } };

  for (const linea of lineas) {
    if (!linea) { cerrarLista(); continue; }

    const codigoLinea = codigosPosicion.find(c => linea.startsWith(`${c} —`) || linea.startsWith(`${c} -`) || linea.startsWith(`${c}:`));
    if (codigoLinea) {
      cerrarLista();
      const significado = significadosPorCodigo.get(codigoLinea) || '';
      if (significado) {
        // C1 — significado de la posición, y debajo "NOMBRE (orientación)"
        html += renderEncabezadoPosicion({
          codigo: codigoLinea,
          significado,
          subtitulo: linea.slice(codigoLinea.length).replace(/^\s*[—\-:]\s*/, ''),
          claseSub: 'lectura__carta-nombre',
        });
      } else {
        html += `<h3>${_esc(linea)}</h3>`;
      }
      continue;
    }
    if (_SUBTITULOS_LECTURA_IA.has(linea)) {
      cerrarLista();
      html += `<h4>${_esc(linea)}</h4>`;
      continue;
    }
    const bullet = linea.match(/^[-•]\s+(.*)$/);
    if (bullet) {
      if (!listaAbierta) { html += '<ul>'; listaAbierta = true; }
      html += `<li>${_esc(bullet[1])}</li>`;
      continue;
    }
    cerrarLista();
    html += `<p>${_esc(linea)}</p>`;
  }
  cerrarLista();
  return html;
}

/**
 * Respaldo si el Worker no está configurado o la llamada falla — versión
 * simple basada en los campos ya cargados, para que la Vista de lectura
 * nunca se quede mostrando "Generando..." para siempre.
 */
function _fallbackVistaLectura(cartas, posicionesPorId) {
  const parrafos = cartas.map((carta, i) => {
    const posicionTexto = _resolverTextoPosicion(posicionesPorId[i], carta.arcano_es, cartas.length === 1);
    const encabezado = cartas.length > 1
      ? renderEncabezadoPosicion({
          codigo: carta.posicionCodigo || posicionesPorId[i]?.posicion || `C${i + 1}`,
          significado: _resolverTextoPosicion(posicionesPorId[i], carta.arcano_es, false),
          subtitulo: `${getNombreCompleto(carta)} — ${carta.orientacion}`,
          claseSub: 'lectura__carta-nombre',
        })
      : `<h3>${_esc(getNombreCompleto(carta))} — ${carta.orientacion}</h3>
      ${posicionTexto ? `<p class="lectura__posicion">${_esc(posicionTexto)}</p>` : ''}`;
    return `${encabezado}
      <p>${_esc(_respuestaCortaCarta(carta))}</p>`;
  }).join('');
  return `${parrafos}<p class="lectura__nota-estudio">No se pudo generar la lectura completa en este momento — este es un resumen más simple. Podés cambiar a la Vista de estudio arriba para el detalle completo.</p>`;
}

/**
 * Llama al Worker con los datos de esta tirada y arma el HTML final.
 * Cacheada por _render() en una promesa (ver "promesaLecturaIA" más
 * abajo) para no volver a pedirle a Gemini si el usuario cambia de vista
 * y vuelve.
 */
async function _generarHtmlLecturaIA(tirada, cartas, posicionesPorId, pares) {
  const texto = await generarLecturaCompleta({
    idTirada: tirada.id_tirada,
    nombreTirada: tirada.nombre_tirada,
    cartas: _armarPayloadLecturaIA(cartas, posicionesPorId),
    combinaciones: _armarPayloadCombinacionesIA(pares),
  });
  if (!texto) return { html: _fallbackVistaLectura(cartas, posicionesPorId), ok: false };
  const codigos = cartas.map((c, i) => c.posicionCodigo || posicionesPorId[i]?.posicion || `C${i + 1}`);
  const significados = new Map();
  if (cartas.length > 1) {
    cartas.forEach((c, i) => {
      const t = _resolverTextoPosicion(posicionesPorId[i], c.arcano_es, false);
      if (t) significados.set(codigos[i], t);
    });
  }
  return { html: _renderTextoLecturaIA(texto, codigos, significados), ok: true };
}

/**
 * Vista de lectura. Una sola carta: no hace falta pedirle nada a
 * Gemini, se muestra directo. Más de una carta: placeholder mientras se
 * genera — quien orquesta el llamado real es _mostrarVista() en
 * _render(), porque este HTML puede quedar guardado sin insertarse en
 * el DOM si el usuario arranca en la Vista de estudio.
 */
function _renderVistaLectura(cartas, posicionesPorId) {
  // FIX 29/9/2026: antes, con 1 sola carta, se mostraba un resumen corto
  // fijo (sin pedirle nada a la IA) y con más de 1 carta se generaba la
  // lectura completa ("Aspectos positivos/a considerar" + Síntesis +
  // Mensaje final). A pedido de Kiko, ahora 1 carta recibe el mismo
  // tratamiento — el Worker ya soporta tiradas de 1 posición sin cambios
  // (ver cloudflare-worker/sintesis-respuesta.js: combinaciones vacío es
  // válido). Por eso ya NO hay rama especial para cartas.length === 1:
  // siempre se muestra el placeholder y _mostrarVista() dispara la IA.
  return `
    <section class="vista-lectura" id="vista-lectura-ia">
      <p class="lectura__generando">Generando tu lectura… puede tardar unos segundos.</p>
    </section>`;
}

// ── ENSAMBLADO ─────────────────────────────────────────────────────────

async function _render() {
  const contenedor = document.getElementById('contenido-veredicto');
  const datos = _leerTiradaActual();

  if (!datos || !datos.idTirada || !datos.cartasSeleccion?.length) {
    contenedor.innerHTML = `<p>No se encontró la tirada. Volvé a <a href="listado-tiradas.html">elegir una tirada</a>.</p>`;
    return;
  }
  const { idTirada, tema, cartasSeleccion } = datos;

  const [tirada, posicionesTirada, cartas, sinonimos] = await Promise.all([
    getTiradaById(idTirada),
    getPosicionesByTirada(idTirada),
    _cargarCartasCompletas(cartasSeleccion),
    getSinonimos(),
  ]);
  const posiciones = _resolverPosiciones(cartas, posicionesTirada);

  const paresBase = _paresUnicos(cartas);
  const pares = await Promise.all(paresBase.map(async (p) => ({
    ...p,
    combinacion: await getCombinacionDirecta(p.carta1, p.carta2),
  })));

  const htmlEstudio = `
    ${await _renderRespuesta(tirada, cartas, pares)}
    ${_renderParteA(cartas, posiciones, pares, tema)}
    ${await _renderParteB(pares, sinonimos)}
    ${_renderParteC(cartas, pares)}
    ${_renderAcciones()}
    ${_renderCombinaciones(pares)}
  `;
  const htmlLectura = `
    ${_renderVistaLectura(cartas, posiciones)}
    ${_renderAcciones()}
  `;

  contenedor.innerHTML = `
    ${_renderTiraDeCartas(cartas, posiciones)}
    <h1>${_esc(tirada?.nombre_tirada || '')}</h1>
    <div class="toggle-vista" role="tablist">
      <button type="button" class="toggle-vista__btn" data-vista="lectura" role="tab">Vista de lectura</button>
      <button type="button" class="toggle-vista__btn" data-vista="estudio" role="tab">Vista de estudio</button>
    </div>
    <div id="cuerpo-veredicto"></div>
    ${renderFormularioConsulta()}
  `;

  const cuerpo = document.getElementById('cuerpo-veredicto');
  const botones = contenedor.querySelectorAll('.toggle-vista__btn');
  const vistas = { estudio: htmlEstudio, lectura: htmlLectura };

  // Guarda la promesa de la lectura generada por IA — así, si el usuario
  // cambia a "estudio" y vuelve a "lectura", no se le vuelve a pedir a
  // Gemini (que tarda varios segundos y gasta cuota); se reinserta el
  // mismo resultado. null hasta que se pide por primera vez.
  let promesaLecturaIA = null;

  function _mostrarVista(nombre) {
    cuerpo.innerHTML = vistas[nombre];
    botones.forEach(b => b.classList.toggle('toggle-vista__btn--activo', b.dataset.vista === nombre));
    _conectarAcciones();

    if (nombre === 'lectura') {  // FIX 29/9/2026: ya no se excluye a las tiradas de 1 carta
      if (!promesaLecturaIA) {
        promesaLecturaIA = _generarHtmlLecturaIA(tirada, cartas, posiciones, pares);
      }
      mostrarEstadoVistas('generando');
      promesaLecturaIA.then(({ html, ok }) => {
        const contenedorIA = document.getElementById('vista-lectura-ia');
        if (contenedorIA) contenedorIA.innerHTML = html;
        mostrarEstadoVistas(ok ? 'dos' : 'fallo');
      });
    }
  }

  botones.forEach(b => b.addEventListener('click', () => _mostrarVista(b.dataset.vista)));

  // ── Guardado: las DOS vistas, no solo la que está abierta ──────────────
  // Vista de estudio: ya está en memoria (htmlEstudio). Vista de lectura:
  // la escribe la IA solo al abrir esa pestaña; si todavía no se pidió, se
  // pide ahora (máx. 45 s). Si falla o tarda de más, se guarda igual solo
  // con la de estudio y se marca `lecturaGenerada: false` para que el
  // historial avise de que falta.
  const _sinAcciones = (html) => html.replace(/<div class="acciones">[\s\S]*?<\/div>/, '');

  async function _obtenerVistasParaGuardar() {
    // La vista de lectura solo existe si la persona la pinchó (así se pidió
    // la IA). Si no la pinchó, NO se genera ahora: se guarda solo estudio.
    // Si la pinchó y la IA aún está escribiendo, se espera (máx. 45 s).
    let lectura = null;
    if (promesaLecturaIA) {
      try {
        lectura = await Promise.race([
          promesaLecturaIA,
          new Promise(resolve => setTimeout(() => resolve(null), 45000)),
        ]);
      } catch (err) {
        console.error('[veredicto] No se pudo obtener la vista de lectura para guardar:', err);
      }
    }
    return {
      vistaEstudioHtml: _sinAcciones(htmlEstudio),
      vistaLecturaHtml: lectura?.ok ? `<section class="vista-lectura">${lectura.html}</section>` : '',
      lecturaGenerada: !!lectura?.ok,
    };
  }

  let _guardando = false;
  let _lecturaGuardadaId = null;   // tras el primer guardado, los siguientes actualizan esa misma ficha
  conectarFormularioConsulta(async () => {
    if (_guardando) return;
    _guardando = true;
    const btn = document.getElementById('btn-guardar-historial-form');
    if (btn) btn.disabled = true;
    try {
      const mod = await import('./nuevo-guardar.js?v=6');
      await mod.guardarLecturaActual({
        tradicion: 'rws', tirada, cartas, pares, tema,
        obtenerVistas: _obtenerVistasParaGuardar,
        lecturaId: _lecturaGuardadaId,
        onGuardada: (id) => {
          _lecturaGuardadaId = id;
          const b = document.getElementById('btn-guardar-historial-form');
          if (b) b.textContent = 'Actualizar lectura guardada';
        },
      });
    } finally {
      _guardando = false;
      if (btn) btn.disabled = false;
    }
  });

  // Siempre abre en Vista de estudio (no usa IA). La IA solo se pide si la
  // persona pincha "Vista de lectura".
  _mostrarVista('estudio');
}

function _conectarAcciones() {
  document.getElementById('btn-copiar')?.addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('cuerpo-veredicto').innerText);
  });
}

document.addEventListener('DOMContentLoaded', _render);
