/**
 * @file veredicto-marsella.js
 * @description Reemplaza a resultado-marsella.js. Orden de página definido
 *   el 24/8/2026: Tira de cartas → Respuesta → Parte A (recorrido por
 *   posiciones) → Parte B (fusión de combinaciones) → Acciones (Copiar +
 *   Guardar en historial) → Combinaciones de esta tirada (máx. 5) →
 *   Cartas de esta tirada. Marsella no tiene Parte C (es exclusiva RWS).
 *
 *   El botón "Regenerar conclusión" y `_renderSintesisPares` (que existían
 *   en resultado-marsella.js/html) se retiraron: el primero no tiene
 *   función con Parte B determinista (sin Math.random()); el segundo
 *   quedó cubierto, y mejor resuelto, por Parte B + "Combinaciones de
 *   esta tirada" (resumen + ficha completa bajo demanda).
 *
 * @nota_de_alcance La generación de Respuesta (el veredicto directo a la
 *   pregunta, ponderado por dominancia) se aprobó como CONTENIDO/ESTRUCTURA
 *   sobre el mockup, pero a diferencia de Parte A/B/C no se definió su
 *   algoritmo de generación frase por frase con el mismo nivel de detalle.
 *   Esta implementación es una primera pasada razonable — conviene una
 *   revisión dedicada a Respuesta con el mismo rigor usado hoy en todo lo
 *   demás antes de considerarla cerrada.
 */

import { getTiradaById, getPosicionesByTirada, getCartaById, getSinonimos, getTipoVeredicto } from './js/data-marsella.js';
import { generarLecturaCompleta } from './js/sintesis-ia.js';
import { mapearTemaAColumna } from './js/readings-marsella.js';
import { getCombinacionDirecta, buildBadgeTipoCombinacion, renderCombinacionCompleta, renderFilaResumenCombinacion } from './js/combinations-marsella.js';
import { getNombreCompleto, renderPlaceholderCarta } from './js/card-helpers.js';
import { renderEncabezadoPosicion } from './nuevo-formulario.js';
import { renderFormularioConsulta, conectarFormularioConsulta, mostrarEstadoVistas } from './nuevo-formulario.js';
import { getMazo, getTiradaActual } from './js/navigation.js';
import { fusionarTextos } from './js/fusion-sinonimos.js';
import { fusionarTiempos } from './js/tiempo-fusion.js';
import { notaDominanciaMarsella } from './js/dom-nota.js';
import { elegirTop5Marsella } from './js/max-combinaciones.js';

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
 * Corregido 25/8/2026: este proyecto NO usa query params en la URL — usa
 * localStorage (`tirada_actual`, ver navigation.js). La primera versión de
 * este archivo asumía URLSearchParams sin verificar contra selection.js,
 * que solo hace navigateTo('veredicto-marsella.html') sin ningún query
 * string. `getTiradaActual()` ya devuelve { id_tirada, nombre, tema,
 * num_cartas, cartas: [{id, orientacion, posicion}] }.
 */
function _leerTiradaActual() {
  const tirada = getTiradaActual();
  if (!tirada) return null;
  return {
    idTirada: tirada.id_tirada,
    tema: tirada.tema,
    nombreTirada: tirada.nombre,
    cartasSeleccion: tirada.cartas, // ya trae { id, orientacion, posicion }
  };
}

async function _cargarCartasCompletas(seleccion) {
  return Promise.all(seleccion.map(async (s) => {
    const carta = await getCartaById(s.id);
    return { ...carta, orientacion: s.orientacion, idSeleccion: s.id, posicionCodigo: s.posicion };
  }));
}

/**
 * Arma un lookup { "C1": {posicion, significado}, ... } y devuelve, en el
 * mismo orden que `cartas`, la entrada correspondiente al código de
 * posición real de cada carta (nunca por índice de array — el orden de
 * `posiciones.json` no está garantizado que coincida con el de `cartas`).
 */
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
// Ver @nota_de_alcance arriba: primera pasada razonable, no verificada
// frase por frase como el resto del documento de hoy.

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
 * Rol de una posición dentro de una tirada 'binario' — ver la explicación
 * completa en js/veredicto-rws.js, donde se corrigió primero este mismo
 * error el 22/9/2026 (conteo ciego de sí/no sin mirar qué pregunta
 * respondía cada posición). data/marsella/tipos-veredicto.json es copia
 * de data/rws/tipos-veredicto.json: las 282 tiradas y sus posiciones son
 * las mismas en ambas tradiciones, solo cambia la carta.
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

/** Votos de una tirada 'binario', respetando el rol de cada posición. */
function _calcularVotos(tipoVeredicto, cartas) {
  const votos = cartas
    .map(c => {
      const rol = _rolPosicion(tipoVeredicto, c);
      if (rol === 'descriptiva') return null;
      let sentido = _sentidoRespuesta(_respuestaCortaCarta(c));
      if (rol === 'en_contra' && sentido !== 'depende') sentido = sentido === 'si' ? 'no' : 'si';
      return sentido;
    })
    .filter(Boolean);
  return {
    conteoSi: votos.filter(s => s === 'si').length,
    conteoNo: votos.filter(s => s === 'no').length,
    total: votos.length,
  };
}

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
  const { conteoSi, conteoNo, total } = _calcularVotos(tipoVeredicto, cartas);
  if (total === 0) {
    return 'Ninguna posición de esta tirada se inclina con claridad a un lado — la respuesta es reservada.';
  }
  if (conteoSi === total) {
    return 'Las posiciones que responden directamente a la pregunta coinciden: la respuesta es sí, con matices.';
  }
  if (conteoNo === total) {
    return 'Las posiciones que responden directamente a la pregunta coinciden: la respuesta es no.';
  }
  if (conteoSi === 0 && conteoNo === 0) {
    return 'Las posiciones que responden a la pregunta dan una respuesta reservada, sin inclinarse claramente a un lado.';
  }
  return `${conteoSi} de las ${total} posiciones que responden a la pregunta se inclinan por el sí; ${conteoNo === 1 ? 'una' : conteoNo} por el no.`;
}

function _cartaDominanteGlobal(cartas, dominanciasPorPar) {
  const conteo = new Map();
  for (const { dominancia } of dominanciasPorPar) {
    const m = String(dominancia || '').match(/Arcano dominante:\s*([^.]+)\./i);
    if (m) conteo.set(m[1].trim(), (conteo.get(m[1].trim()) || 0) + 1);
  }
  let mejor = null, mejorN = 0;
  for (const [nombre, n] of conteo) {
    if (n > mejorN) { mejor = nombre; mejorN = n; }
  }
  return mejor ? { nombre: mejor, pares: mejorN } : null;
}

async function _renderRespuesta(tirada, cartas, pares) {
  const tipoVeredicto = await getTipoVeredicto(tirada.id_tirada, cartas.length);
  const tipo = tipoVeredicto.tipo_veredicto;
  const apertura = _calcularApertura(tipoVeredicto, cartas);

  const dominancias = pares.map(p => ({ dominancia: p.combinacion?.dominancia }));
  const dominante = _cartaDominanteGlobal(cartas, dominancias);
  // El cierre de dominancia solo tiene sentido cuando hay un desacuerdo
  // sí/no real que explicar — en tiradas sin ese cálculo (sin_veredicto,
  // eleccion_ab, resolutiva_unica, directa) no hay "quién pesa más" que
  // resolver, así que el cierre queda vacío ahí.
  let cierre = '';
  if (tipo === 'binario') {
    const { conteoSi, conteoNo } = _calcularVotos(tipoVeredicto, cartas);
    const hayDesacuerdo = conteoSi > 0 && conteoNo > 0;
    if (dominante && hayDesacuerdo) {
      cierre = `No es casualidad que sea justamente ${dominante.nombre} quien domina ${dominante.pares > 1 ? 'las combinaciones en las que participa' : 'esta combinación'} — su mensaje es el que más pesa en esta lectura.`;
    }
  }
  const cierreHtml = cierre ? `<p class="respuesta__cierre">${_esc(cierre)}</p>` : '';

  if (tipo === 'sin_veredicto' || tipo === 'eleccion_ab') {
    return `
      <section class="bloque-respuesta">
        <p class="respuesta__apertura"><strong>${_esc(apertura)}</strong></p>
        <ul class="respuesta__desarrollo" id="respuesta-lista">${_listaCartas(cartas)}</ul>
      </section>`;
  }

  if (tipo === 'directa' || tipo === 'resolutiva_unica') {
    const cartaResolutiva = tipo === 'directa'
      ? cartas[0]
      : (cartas.find(c => c.posicionCodigo === tipoVeredicto.posicion_resolutiva) || cartas[cartas.length - 1]);
    const otras = cartas.filter(c => c !== cartaResolutiva);
    return `
      <section class="bloque-respuesta">
        <p class="respuesta__apertura"><strong>${_esc(apertura)}</strong></p>
        ${otras.length ? `<ul class="respuesta__desarrollo" id="respuesta-lista">${_listaCartas(otras)}</ul>` : ''}
      </section>`;
  }

  return `
    <section class="bloque-respuesta">
      <p class="respuesta__apertura"><strong>${_esc(apertura)}</strong></p>
      <ul class="respuesta__desarrollo" id="respuesta-lista">${_listaCartas(cartas, tipoVeredicto)}</ul>
      ${cierreHtml}
    </section>`;
}

// ── PARTE A: RECORRIDO POR POSICIONES ────────────────────────────────────

// FUSIONADO 18/9/2026, a pedido de la usuaria — mismo criterio que
// veredicto-rws.js: se funde con "Cartas de esta tirada" en un solo
// bloque por carta (nombre/posición una sola vez). "Punto ciego de esta
// carta" y "Próximo paso con esta carta" son SOLO de esta carta
// (alerta_recta/inv, proximo_paso_recta/inv) — se etiquetan así porque
// Parte B, más abajo, trae su propia Alerta y Próximo paso fusionados
// entre TODOS los pares de la tirada (comb_alerta, comb_proximo_paso):
// son dos datos reales y distintos, no el mismo repetido, pero conviven
// en la misma página y necesitan quedar claros. A diferencia de RWS,
// `caracteristicas` en Marsella no tiene versión _recta/_inv (un solo
// registro para ambas orientaciones — ver render-carta-marsella.js).
/**
 * Algunos campos siguen el patrón `${base}_recta` / `${base}_inv`; otros
 * (como 'caracteristicas' en Marsella) no tienen sufijo y valen para
 * ambas orientaciones. Este helper prueba el campo sufijado y si no
 * existe cae al campo base.
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
  const columnaTema = mapearTemaAColumna(tema);

  const filas = cartas.map((carta, i) => {
    const susPares = pares
      .filter(p => p.carta1 === carta || p.carta2 === carta)
      .map(p => ({
        otraCarta: getNombreCompleto(p.carta1 === carta ? p.carta2 : p.carta1),
        dominancia: p.combinacion?.dominancia,
      }));
    const domNota = susPares.length ? notaDominanciaMarsella(carta.arcano_es, susPares) : '';
    const inv = carta.orientacion === 'invertida';
    const suf = inv ? '_inv' : '_recta';

    const claves = _primerasNPalabras(carta[`palabras_clave${suf}`], 5);
    const campoTema = columnaTema ? `${columnaTema}${suf}` : null;
    const interpretacionTema = (campoTema ? carta[campoTema] : '') || '';

    // Bloques nuevos (22/9/2026, misma tanda que RWS pero con los campos
    // propios de Marsella — no hay 'esencia' ni 'actividades_sugeridas'
    // ni 'aspecto_fisico_gd' ni 'velocidad_carta' en este mazo; en
    // cambio sí hay tríada numerológica, jerarquía de figura y polaridad
    // de palo, que RWS no tiene. No es el mismo set de campos, es el
    // equivalente de cada tradición.
    const bloqueEsencia = _bloqueDetalle('Personalidad y dinámica', [
      { etiqueta: 'Personalidad', valor: _campoOrientado(carta, 'aspectos_personalidad', suf) },
      { etiqueta: 'Dinámica', valor: _campoOrientado(carta, 'dinamica', suf) },
      { etiqueta: 'Lugar asociado', valor: _campoOrientado(carta, 'lugar', suf) },
    ]);

    const bloqueIconografia = _bloqueDetalle('Iconografía y símbolos', [
      { etiqueta: 'Descripción de la imagen', valor: carta.descripcion_iconografica },
      { etiqueta: 'Simbolismo', valor: carta.simbolismo },
      { etiqueta: 'Símbolos presentes', valor: carta.simbolos_iconograficos },
    ]);

    const bloqueMiradas = _bloqueDetalle('Mirada y tiempo', [
      { etiqueta: 'Dirección de la mirada', valor: carta.direccion_mirada },
      { etiqueta: 'Ley de miradas (tiempo)', valor: carta.ley_miradas_temporal },
    ]);

    const bloqueNumerologia = _bloqueDetalle('Numerología y jerarquía', [
      { etiqueta: 'El número en esta carta', valor: carta.relacion_numeral },
      { etiqueta: 'Tríada numerológica', valor: carta.triada_numerologica },
      { etiqueta: 'Arcano mayor numérico relacionado', valor: carta.arcano_mayor_numerico },
      { etiqueta: 'Jerarquía de la figura', valor: carta.jerarquia_figura },
      { etiqueta: 'Polaridad del palo', valor: carta.polaridad_palo },
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
        <p class="parte-a__caracteristicas">${_esc(carta.caracteristicas || '')}</p>
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

  return `
    <section class="parte-a">
      <h2>A — Recorrido por posiciones</h2>
      ${filas}
    </section>`;
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
  if (pares.length === 0) return '';

  const combs = pares.map(p => p.combinacion).filter(Boolean);
  if (combs.length === 0) return '';

  // Corregido 25/8/2026: en Marsella, tipo=null en TODAS las combinaciones
  // menor×menor (no aplica clasificación Resonancia/Tensión ahí, mismo
  // criterio que ya usa `dominancia` con su "No aplica" explícito). Antes
  // se contaba como categoría vacía ("3 de ."). Ahora se excluye del
  // conteo y, si corresponde, se aclara aparte.
  const combsClasificables = combs.filter(c => c.tipo);
  const tipos = combsClasificables.map(c => (c.tipo || '').split(':')[0].trim());
  const tiposUnicos = [...new Set(tipos)];
  const sinClasificar = combs.length - combsClasificables.length;
  let aperturaTipo;
  if (tiposUnicos.length === 0) {
    aperturaTipo = 'Esta tirada combina solo cartas menores entre sí — no hay clasificación de Resonancia/Tensión disponible para estos pares.';
  } else {
    aperturaTipo = tiposUnicos.length === 1
      ? `${sinClasificar === 0 ? 'Las' : `De las ${combsClasificables.length} combinaciones con clasificación disponible, las`} son de <strong>${_esc(tiposUnicos[0])}</strong>.`
      : `De las combinaciones con clasificación disponible, se reparten: ${tiposUnicos.map(t => `${tipos.filter(x => x === t).length} de ${t}`).join(', ')}.`;
    if (sinClasificar > 0) aperturaTipo += ` (${sinClasificar} ${sinClasificar === 1 ? 'combinación menor×menor no tiene' : 'combinaciones menor×menor no tienen'} esta clasificación.)`;
  }

  const momento = fusionarTextos(combs.map(c => c.comb_momento), sinonimos);
  const evolucion = fusionarTextos(combs.map(c => c.comb_evolucion), sinonimos);
  const consejo = fusionarTextos(combs.map(c => c.comb_consejos), sinonimos);
  const habilidad = fusionarTextos(combs.map(c => c.comb_habilidad), sinonimos);
  const tiempoFrase = fusionarTiempos(combs.map(c => c.comb_tiempo), 'marsella');

  const parrafo = `
    <p>${aperturaTipo} ${_esc(`En conjunto, ${momento.texto}.`)}
    ${_esc(`Sobre cómo evolucionar, ${evolucion.texto}.`)} ${_esc(tiempoFrase)}
    ${_esc(`Sobre el consejo, ${consejo.texto}.`)} ${_esc(`Sobre la habilidad que piden estas cartas, ${habilidad.texto}.`)}</p>`;

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
  // Marsella no tiene valencia_combinacion ni nivel_tension (ver nota en
  // _renderParteC): la señal de fricción más cercana disponible es
  // compatibilidad_palos = "Afinidad opuesta". Mismo criterio de fondo
  // que en RWS: solo tono de alarma (rojo) si hay una señal real, no en
  // el 100% de las tiradas (decisión con la usuaria el 11/9/2026).
  const esAlertaSeria = combs.some(c => (c.compatibilidad_palos || '').split(':')[0].trim() === 'Afinidad opuesta');

  // Lectura de cada par (interpretacion) — antes solo visible en la
  // página aparte de detalle de combinación. Misma tanda que en RWS,
  // 22/9/2026, limitada a los mismos 5 pares de elegirTop5Marsella.
  const top5ParaInterpretacion = elegirTop5Marsella(pares.filter(p => p.combinacion));
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
        ${combs.length > 5 ? `<p class="ver-todas"><a href="combinaciones-marsella.html">Ver la interpretación de todos los pares →</a></p>` : ''}
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

// ── PARTE C — AFINIDAD Y JERARQUÍA ────────────────────────────────────────
// Equivalente a "C — Energía y elementos" de RWS, pero con el esquema de
// datos propio de Marsella (Sección 8.2): no existe valencia_combinacion ni
// nivel_tension acá, así que no hay barra de tensión 1-5 — sería un número
// inventado. En su lugar: compatibilidad_palos (afinidad elemental, 3
// categorías reales) y dinamica_rector_subordinado (quién marca el tono).
// Decisión tomada con la usuaria el 9/9/2026: sin tensión numérica.
function _renderParteC(cartas, pares) {
  const combs = pares.filter(p => p.combinacion).map(p => p.combinacion);
  if (combs.length === 0) return '';

  // Recolectamos, por cada campo, qué categorías aparecieron y su
  // definición real (el texto después de los dos puntos en el propio
  // dato) — misma lógica que la leyenda de valencia en RWS, sin inventar
  // glosario.
  const afinidadesUsadas = new Map();
  const jerarquiasUsadas = new Map();

  const filas = pares.filter(p => p.combinacion).map(p => {
    const c = p.combinacion;
    const [catAfinidad, defAfinidad] = (c.compatibilidad_palos || '').split(':').map(s => (s || '').trim());
    const [catJerarquia, defJerarquia] = (c.dinamica_rector_subordinado || '').split(':').map(s => (s || '').trim());
    if (catAfinidad && defAfinidad) afinidadesUsadas.set(catAfinidad, defAfinidad);
    if (catJerarquia && defJerarquia) jerarquiasUsadas.set(catJerarquia, defJerarquia);
    return `
      <div class="tension-fila">
        <span>${_esc(getNombreCompleto(p.carta1))} + ${_esc(getNombreCompleto(p.carta2))}</span>
        <span>${_esc(catAfinidad || 'Sin datos')}</span>
        <span>${_esc(catJerarquia || 'Sin datos')}</span>
      </div>`;
  }).join('');

  const construirLeyenda = (mapa) => [...mapa.entries()].map(([categoria, definicion]) => `
    <div class="leyenda-valencia__item">
      <dt>${_esc(categoria)}</dt>
      <dd>${_esc(definicion)}</dd>
    </div>`).join('');

  const leyenda = (afinidadesUsadas.size || jerarquiasUsadas.size) ? `
    <dl class="leyenda-valencia">
      ${construirLeyenda(afinidadesUsadas)}
      ${construirLeyenda(jerarquiasUsadas)}
    </dl>` : '';

  // AÑADIDO 27/9/2026, a pedido de Kuka ("enseñar el máximo"): 7 campos
  // de combinación con contenido real que no se mostraban en ningún
  // lado. Mismo criterio que RWS: limitado a los 5 pares principales.
  const paresConCombinacion = pares.filter(p => p.combinacion);
  const top5Estructura = elegirTop5Marsella(paresConCombinacion);
  const bloquesEstructura = top5Estructura.map(p => {
    const c = p.combinacion;
    const fila = (etiqueta, valor) => valor ? `<p><strong>${_esc(etiqueta)}:</strong> ${_esc(valor)}</p>` : '';
    return `
      <details class="parte-c__detalle" open>
        <summary>${_esc(getNombreCompleto(p.carta1))} + ${_esc(getNombreCompleto(p.carta2))}</summary>
        <div class="parte-c__grupo">
          <h4>Estructura y categoría</h4>
          ${fila('Categoría de la combinación', c.categoria_combinacion)}
          ${fila('Arcano rector del resultado', c.arcano_rector_resultado)}
          ${fila('¿Es simétrica?', c.es_simetrica)}
        </div>
        <div class="parte-c__grupo">
          <h4>Numerología del par</h4>
          ${fila('Relación numérica', c.relacion_numerica)}
          ${fila('Tríada rectora compartida', c.triada_rectora_compartida)}
        </div>
        <div class="parte-c__grupo">
          <h4>Iconografía y miradas</h4>
          ${fila('Ley de repetición', c.ley_repeticion)}
          ${fila('Diálogo de miradas', c.dialogo_miradas)}
        </div>
      </details>`;
  }).join('');

  return `
    <section class="parte-c">
      <h2>C — Afinidad y jerarquía</h2>
      <div class="tension-tabla tension-tabla--marsella">
        <div class="tension-fila tension-fila--header">
          <span>Par</span><span>Afinidad de palos</span><span>Quién rige</span>
        </div>
        ${filas}
      </div>
      ${leyenda}
      ${bloquesEstructura ? `<h3>Estructura numerológica e iconográfica de cada par</h3>${bloquesEstructura}` : ''}
    </section>`;
}

// ── COMBINACIONES DE ESTA TIRADA (máx. 5) ─────────────────────────────────

function _renderCombinaciones(pares, idTirada) {
  const paresConCombinacion = pares.filter(p => p.combinacion);
  if (paresConCombinacion.length === 0) return '';
  const top5 = elegirTop5Marsella(paresConCombinacion.map(p => ({ ...p, tipo: p.combinacion.tipo })));

  const filas = top5.map(p => {
    // detalle-combinacion-marsella.html lee id1/id2 (ver su init()); la
    // posición no viaja por URL porque esa página ya ofrece las 4 pestañas.
    const urlDetalle = `detalle-combinacion-marsella.html?id1=${p.carta1.id}&id2=${p.carta2.id}`;
    return renderFilaResumenCombinacion(p.carta1, p.carta2, p.combinacion, urlDetalle);
  }).join('');

  return `
    <section class="combinaciones-tirada">
      <h2>Combinaciones de esta tirada</h2>
      ${filas}
      ${paresConCombinacion.length > 5 ? `<p class="ver-todas"><a href="combinaciones-marsella.html">Explorar todas las combinaciones →</a></p>` : ''}
    </section>`;
}

// ── CARTAS DE ESTA TIRADA (definido 24/8/2026 — 5 líneas por carta) ──────

function _primerasNPalabras(texto, n) {
  return String(texto || '').split(',').map(s => s.trim()).slice(0, n).join(' · ');
}

// ── ACCIONES (Copiar + Guardar en historial) ─────────────────────────────

function _renderAcciones() {
  return `
    <div class="acciones">
      <button id="btn-copiar" type="button" class="btn btn--outline">
        <i class="ph ph-copy" aria-hidden="true"></i> Copiar
      </button>
    </div>`;
}

// ── VISTA DE LECTURA (narrativa) ─────────────────────────────────────────
// Mismo criterio que veredicto-rws.js. Adaptación: Marsella no tiene
// nivel_tension, así que el "cierre" de atención especial usa
// compatibilidad_palos = "Afinidad opuesta" como señal (mismo proxy que
// ya se usa en la severidad de la Alerta de Parte B). Decisión con la
// usuaria el 11/9/2026.
/**
 * Arma, para cada carta, los datos que el Worker de Gemini necesita.
 * Nota: en Marsella "caracteristicas" no tiene sufijo de orientación
 * (a diferencia de RWS) — por eso usa _campoOrientado, que ya resuelve
 * esa irregularidad (ver su comentario más arriba en este archivo).
 */
function _armarPayloadLecturaIA(cartas, posicionesPorId) {
  return cartas.map((carta, i) => {
    const suf = carta.orientacion === 'invertida' ? '_inv' : '_recta';
    return {
      posicion: carta.posicionCodigo || posicionesPorId[i]?.posicion || `C${i + 1}`,
      significado: posicionesPorId[i]?.significado || '',
      carta: getNombreCompleto(carta),
      orientacion: carta.orientacion,
      caracteristicas: _campoOrientado(carta, 'caracteristicas', suf),
      tendencia: carta[`tendencia${suf}`] || '',
      alerta: carta[`alerta${suf}`] || '',
      decisiones: carta[`decisiones${suf}`] || '',
    };
  });
}

/**
 * Mismo agregado que en veredicto-rws.js (26/9/2026) — ver ese
 * comentario. Único cambio de nombre entre tradiciones: en Marsella el
 * campo es "comb_consejos" (plural), no "comb_consejo".
 */
function _armarPayloadCombinacionesIA(pares) {
  const paresConCombinacion = pares.filter(p => p.combinacion);
  const top5 = elegirTop5Marsella(paresConCombinacion);
  return top5.map(p => ({
    carta1: getNombreCompleto(p.carta1),
    carta2: getNombreCompleto(p.carta2),
    interpretacion: p.combinacion.interpretacion || '',
    consejo: p.combinacion.comb_consejos || '',
    tiempo: p.combinacion.comb_tiempo || '',
    proximoPaso: p.combinacion.comb_proximo_paso || '',
    alerta: p.combinacion.comb_alerta || '',
    momento: p.combinacion.comb_momento || '',
    habilidad: p.combinacion.comb_habilidad || '',
    evolucion: p.combinacion.comb_evolucion || '',
  }));
}

const _SUBTITULOS_LECTURA_IA = new Set(['Aspectos positivos', 'Aspectos a considerar', 'Síntesis', 'Mensaje final']);

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

  const [tirada, posicionesTirada, cartasSinPosicion, sinonimos] = await Promise.all([
    getTiradaById(idTirada),
    getPosicionesByTirada(idTirada),
    _cargarCartasCompletas(cartasSeleccion),
    getSinonimos(),
  ]);
  const cartas = cartasSinPosicion;
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
    ${_renderCombinaciones(pares, idTirada)}
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
        tradicion: 'marsella', tirada, cartas, pares, tema,
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
