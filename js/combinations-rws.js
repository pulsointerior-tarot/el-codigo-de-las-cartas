/**
 * combinations-rws.js — Lógica de combinaciones entre arcanos, Rider-Waite-Smith
 * "El Código de las Cartas"
 *
 * Responsabilidad: Reglas de negocio de combinaciones. NO hace fetch() directamente.
 * Importa buscarCombinacion() y getPosicionCombinacion() de data-rws.js.
 *
 * Muestra los 36 campos visibles de combinaciones-rws (id_carta_1/id_carta_2
 * no se muestran, Sección 8.4 del Documento Maestro v3.3): todos visibles en
 * resultado y en detalle-combinacion-rws.html, sin distinción entre ambos
 * (Sección 14.2 — decisión confirmada 8/8/2026).
 *
 * NOTA campo: el Documento Maestro (tabla Sección 8.4) llama al campo de
 * consejo "comb_consejos" (plural); el JSON real trae "comb_consejo"
 * (singular) — discrepancia de nombre en el texto del documento, no en los
 * datos; se usa aquí el nombre real del JSON.
 *
 * Exports:
 *   getCombinacionDirecta(carta1, carta2)
 *   getTodosLosPares(cartasArray)
 *   buildBadgeTipoCombinacion(tipo)
 *   renderCombinacionCompleta(comb, carta1obj, carta2obj)
 *   renderFilaResumenCombinacion(carta1obj, carta2obj, combinacion, urlDetalle)
 */

import { buscarCombinacion, getPosicionCombinacion } from './data-rws.js';

// ── HELPERS INTERNOS ─────────────────────────────────────────────────────────

/**
 * Ejecuta tareas en lotes para no saturar el event loop.
 * @param {Array<() => Promise>} tasks
 * @param {number} batchSize
 * @param {number} delayMs
 * @returns {Promise<Array>}
 */
async function _runInBatches(tasks, batchSize = 15, delayMs = 0) {
  const results = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn => fn()));
    results.push(...batchResults);
    if (delayMs > 0 && i + batchSize < tasks.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return results;
}

/**
 * Escapa caracteres HTML para evitar XSS.
 * @param {string} str
 * @returns {string}
 */
function _esc(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Renderiza una fila .dato-item. Devuelve '' si el valor está vacío.
 * @param {string} label
 * @param {string} valor
 * @param {string} [htmlValor] — HTML ya construido para el valor (ej: badge)
 * @returns {string}
 */
function _datoItem(label, valor, htmlValor = null) {
  const contenido = htmlValor !== null ? htmlValor : _esc(valor);
  if (!contenido && contenido !== '0') return '';
  return `
    <div class="dato-item">
      <span class="dato-label">${_esc(label)}</span>
      <span class="dato-valor">${contenido}</span>
    </div>`;
}

/**
 * Renderiza un bloque de sección con título + grid de dato-items.
 * Omite el bloque entero si ningún item tiene contenido.
 * @param {string} titulo
 * @param {Array<{label: string, valor: string}>} items
 * @returns {string}
 */
function _bloque(titulo, items) {
  const filas = items.map(it => _datoItem(it.label, it.valor)).filter(Boolean).join('');
  if (!filas) return '';
  return `
      <div class="mt-3">
        <p style="margin-bottom:var(--space-1); font-family:'Cinzel',serif; font-size:0.8rem;
                  font-weight:700; letter-spacing:0.1em; text-transform:uppercase;
                  color:var(--secondary);">${_esc(titulo)}</p>
        <div class="datos-grid">${filas}</div>
      </div>`;
}

// ── REGLAS DE OMISIÓN CONDICIONAL (Documento Maestro, Sección 8.4 / Tabla 9) ──
// Estos 5 campos de RWS son "condicionales": se omiten cuando su valor no
// aporta información real (verificado contra JSON real, 8/8/2026):
//   - refuerzo_debilidad → omitir si empieza con "Neutro"
//   - dialogo_miradas    → omitir si empieza con "No aplica"
//   - numero_compartido  → omitir si empieza con "No"
//   - diada_quiebre      → omitir si empieza con "No"
//   - relacion_elemental → omitir si empieza con "Neutrales"

function _prefijo(texto) {
  return String(texto || '').split(':')[0].trim();
}

function _valorCondicional(texto, valoresOmitir) {
  if (!texto) return null;
  const p = _prefijo(texto);
  return valoresOmitir.includes(p) ? null : texto;
}

// ── EXPORTS PÚBLICOS ──────────────────────────────────────────────────────────

/**
 * Obtiene la combinación directa entre dos cartas.
 * @param {{ id: number, orientacion: string }} carta1
 * @param {{ id: number, orientacion: string }} carta2
 * @returns {Promise<object|null>}
 */
export async function getCombinacionDirecta(carta1, carta2) {
  const posicion = getPosicionCombinacion(carta1.orientacion, carta2.orientacion);
  return buscarCombinacion(carta1.id, carta2.id, posicion);
}

/**
 * Obtiene todos los pares direccionales (A+B ≠ B+A).
 * Para N cartas genera N×(N-1) pares con batching de 15.
 * @param {Array<{ id: number, orientacion: string }>} cartasArray
 * @returns {Promise<Array<{ carta1, carta2, combinacion }>>}
 */
export async function getTodosLosPares(cartasArray) {
  const pares = [];
  for (let i = 0; i < cartasArray.length; i++) {
    for (let j = 0; j < cartasArray.length; j++) {
      if (i !== j) pares.push({ carta1: cartasArray[i], carta2: cartasArray[j] });
    }
  }
  const tasks = pares.map(({ carta1, carta2 }) => async () => {
    const combinacion = await getCombinacionDirecta(carta1, carta2);
    return { carta1, carta2, combinacion };
  });
  return _runInBatches(tasks, 15, 0);
}

/**
 * Badge de tipo de combinación.
 * @param {string} tipo — texto tipo "Resonancia: descripción..." o valor corto
 * @returns {string}
 */
export function buildBadgeTipoCombinacion(tipo) {
  if (!tipo) return '';
  const categoria = String(tipo).split(':')[0].trim();
  const clase = categoria.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return `<span class="badge-tipo badge-${_esc(clase)}">${_esc(categoria)}</span>`;
}

/**
 * Renderiza la ficha completa de una combinación con los campos del JSON de
 * combinaciones-rws, organizados en bloques según la Sección 8.4 del
 * Documento Maestro. Mismo contenido en veredicto-rws.html y en
 * detalle-combinacion-rws.html (Sección 14.2).
 *
 * A diferencia de Marsella, aquí "posicion" ya viene como código corto limpio
 * ("RR"/"RI"/"IR"/"II"), sin texto descriptivo — no requiere regex.
 *
 * @param {object|null} comb      — registro del JSON de combinaciones-rws
 * @param {object}      carta1obj — objeto carta de cartas-rws.json
 * @param {object}      carta2obj — objeto carta de cartas-rws.json
 * @returns {string} HTML listo para inyectar en el panel de combinación
 */
export function renderCombinacionCompleta(comb, carta1obj, carta2obj) {

  if (!comb) {
    return `
      <div class="empty-state mt-4">
        <i class="ph ph-cards" aria-hidden="true"></i>
        <p>Sin interpretación específica para esta posición.</p>
      </div>`;
  }

  const nombre1 = _esc(carta1obj?.arcano_es ?? comb.arcano_es_1 ?? `Arcano #${comb.id_carta_1}`);
  const nombre2 = _esc(carta2obj?.arcano_es ?? comb.arcano_es_2 ?? `Arcano #${comb.id_carta_2}`);

  const ETIQ_POS = {
    RR: 'Recta · Recta',
    RI: 'Recta · Invertida',
    IR: 'Invertida · Recta',
    II: 'Invertida · Invertida',
  };
  const etiqPosCorta = _esc(ETIQ_POS[comb.posicion] ?? comb.posicion ?? '');

  const badgeSiNo = (() => {
    if (!comb.comb_si_no) return '';
    const v = String(comb.comb_si_no).toLowerCase();
    let estilo;
    if (v.startsWith('no')) {
      estilo = 'color:#F44336; border-color:#F44336; background:rgba(244,67,54,0.1);';
    } else if (v.startsWith('sí') || v.startsWith('si')) {
      estilo = 'color:#4CAF50; border-color:#4CAF50; background:rgba(76,175,80,0.1);';
    } else {
      estilo = 'color:#9E9E9E; border-color:#9E9E9E; background:rgba(158,158,158,0.1);';
    }
    return `<span class="badge-tipo" style="${estilo}">${_esc(comb.comb_si_no)}</span>`;
  })();

  const badgeTipo = buildBadgeTipoCombinacion(comb.dinamica);

  return `
    <div style="padding-bottom: var(--space-4);">

      <!-- ENCABEZADO ────────────────────────────────────────────────── -->
      <div style="padding-bottom:var(--space-3); margin-bottom:var(--space-3);
                  border-bottom:1px solid rgba(201,168,76,0.15);">
        <h2 style="font-family:'Cinzel',serif; font-size:clamp(1rem,2.5vw,1.25rem);
                   font-weight:700; color:var(--text-main); margin:0 0 var(--space-1) 0;">
          ${nombre1} + ${nombre2}
        </h2>
        ${etiqPosCorta
          ? `<p style="font-size:0.82rem; color:var(--text-muted); margin:0 0 var(--space-2) 0;
                       font-family:'Cinzel',serif; letter-spacing:0.05em;">
               Posición: <strong style="color:var(--secondary);">${etiqPosCorta}</strong>
             </p>`
          : ''}
        <div class="cluster" style="gap:var(--space-1);">
          ${badgeTipo}
          ${badgeSiNo}
        </div>
      </div>

      <!-- INTERPRETACIÓN PRINCIPAL ──────────────────────────────────── -->
      ${comb.interpretacion ? `
      <div class="mt-3" style="padding:var(--space-3); background:rgba(201,168,76,0.04);
                  border-left:2px solid rgba(201,168,76,0.35); border-radius:0 6px 6px 0;">
        <p style="margin-bottom:var(--space-1); font-family:'Cinzel',serif; font-size:0.8rem;
                  font-weight:700; letter-spacing:0.1em; text-transform:uppercase;
                  color:var(--secondary);">Interpretación</p>
        <p style="color:var(--text-main); line-height:1.7; margin:0; font-size:0.95rem;">
          ${_esc(comb.interpretacion)}
        </p>
      </div>` : ''}

      <!-- BLOQUE: Interpretación y guía práctica (resto de campos) ──── -->
      ${_bloque('Guía práctica', [
        { label: 'Consejos',            valor: comb.comb_consejo },
        { label: 'Marco temporal',      valor: comb.comb_tiempo },
        { label: 'Próximo paso',        valor: comb.comb_proximo_paso },
        { label: 'Momento',             valor: comb.comb_momento },
        { label: 'Habilidad requerida', valor: comb.comb_habilidad },
        { label: 'Evolución posible',   valor: comb.comb_evolucion },
      ])}

      <!-- ADVERTENCIA (destacada aparte) ────────────────────────────── -->
      ${comb.comb_alerta ? `
      <div class="mt-3" style="display:flex; align-items:flex-start; gap:var(--space-1);
                  padding:var(--space-2) var(--space-3); background:rgba(244,67,54,0.06);
                  border:1px solid rgba(244,67,54,0.2); border-radius:6px;">
        <i class="ph ph-warning-circle" style="color:#F44336; font-size:1.1rem;
           flex-shrink:0; margin-top:2px;" aria-hidden="true"></i>
        <div>
          <span class="dato-label" style="display:block; margin-bottom:2px;">Alerta</span>
          <span style="color:var(--text-main); font-size:0.9rem; line-height:1.5;">
            ${_esc(comb.comb_alerta)}
          </span>
        </div>
      </div>` : ''}

      <!-- BLOQUE: Jerarquía y dominancia ────────────────────────────── -->
      ${_bloque('Jerarquía y dominancia', [
        { label: 'Dinámica de la combinación',           valor: comb.dinamica },
        { label: 'Dominancia',                            valor: comb.dominancia },
        { label: 'Tipo de combinación',                   valor: comb.tipo },
        { label: 'Composición arquetípica (mayor/menor)', valor: comb.relacion_rango },
        { label: 'Relación entre figuras',                valor: comb.relacion_figura_menor },
        { label: 'Arcano de referencia',                  valor: comb.arcano_mayor_numerico },
      ])}

      <!-- BLOQUE: Estado energético y polaridad ─────────────────────── -->
      <!-- refuerzo_debilidad es condicional: se omite si es "Neutro" (Tabla 9) -->
      ${_bloque('Estado energético y polaridad', [
        { label: `Estado energético — ${nombre1}`, valor: comb.estado_energia_1 },
        { label: `Estado energético — ${nombre2}`, valor: comb.estado_energia_2 },
        { label: 'Tensión',                        valor: comb.tension_polaridad },
        { label: 'Efecto de la inversión',         valor: comb.relacion_inversion },
        { label: 'Refuerzo o debilitamiento',
          valor: _valorCondicional(comb.refuerzo_debilidad, ['Neutro']) },
      ])}

      <!-- BLOQUE: Relación numérica, elemental y temporal ───────────── -->
      <!-- 4 campos condicionales aquí: dialogo_miradas, relacion_elemental,
           numero_compartido, diada_quiebre (ver regla Tabla 9 del maestro) -->
      ${_bloque('Relación numérica, elemental y temporal', [
        { label: 'Relación entre miradas',
          valor: _valorCondicional(comb.dialogo_miradas, ['No aplica']) },
        { label: 'Relación de palos',                 valor: comb.relacion_palos },
        { label: 'Relación elemental',
          valor: _valorCondicional(comb.relacion_elemental, ['Neutrales']) },
        { label: 'Dinámica elemental',                 valor: comb.dinamica_elemental },
        { label: 'Número compartido',
          valor: _valorCondicional(comb.numero_compartido, ['No']) },
        { label: 'Suma reducida',                        valor: comb.suma_reducida },
        { label: 'Arcano de síntesis',                   valor: comb.arcano_sintesis },
        { label: 'Velocidad de la combinación',          valor: comb.velocidad_diada },
        { label: 'Combinación de quiebre',
          valor: _valorCondicional(comb.diada_quiebre, ['No']) },
        { label: 'Valencia',                              valor: comb.valencia_combinacion },
        { label: 'Nivel de tensión',                      valor: comb.nivel_tension },
        { label: 'Posición relativa en la tirada',        valor: comb.posicion_relativa },
      ])}

      <!-- REFERENCIA TÉCNICA (discreta) ─────────────────────────────── -->
      <p class="text-muted mt-4" style="font-size:0.72rem; text-align:right; opacity:0.4;
         font-family:'Source Sans 3',sans-serif;">
        #${_esc(String(comb.id_carta_1))} · #${_esc(String(comb.id_carta_2))} · ${_esc(comb.posicion)}
      </p>

    </div>`;
}

/**
 * Renderiza una fila de resumen para veredicto-rws.html con >2 cartas.
 * @param {object}      carta1obj
 * @param {object}      carta2obj
 * @param {object|null} combinacion
 * @param {string}      urlDetalle
 * @returns {string}
 */
export function renderFilaResumenCombinacion(carta1obj, carta2obj, combinacion, urlDetalle) {
  const nombre1 = _esc(carta1obj?.arcano_es ?? '—');
  const nombre2 = _esc(carta2obj?.arcano_es ?? '—');

  if (!combinacion) {
    return `
      <div class="dato-item" style="opacity:0.45; padding:var(--space-1) 0;">
        <span class="dato-label">${nombre1} × ${nombre2}</span>
        <span class="dato-valor" style="font-size:0.8rem;">Sin interpretación específica</span>
      </div>`;
  }

  const badgeTipo = buildBadgeTipoCombinacion(combinacion.dinamica);

  return `
    <a href="${_esc(urlDetalle)}"
       style="display:grid; grid-template-columns:1fr auto 1fr auto;
              align-items:center; gap:var(--space-2);
              padding:var(--space-2) var(--space-2);
              border-radius:6px;
              border:1px solid rgba(201,168,76,0.1);
              background:rgba(201,168,76,0.03);
              text-decoration:none;
              transition:background 0.2s, border-color 0.2s;"
       onmouseover="this.style.background='rgba(201,168,76,0.08)';this.style.borderColor='rgba(201,168,76,0.25)';"
       onmouseout="this.style.background='rgba(201,168,76,0.03)';this.style.borderColor='rgba(201,168,76,0.1)';">
      <span style="color:var(--text-main); font-size:0.9rem;">${nombre1}</span>
      <span>${badgeTipo}</span>
      <span style="color:var(--text-main); font-size:0.9rem; text-align:right;">${nombre2}</span>
      <i class="ph ph-arrow-right" style="color:var(--text-muted);" aria-hidden="true"></i>
    </a>`;
}
