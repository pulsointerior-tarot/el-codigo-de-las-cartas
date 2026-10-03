/**
 * render-carta-marsella.js — Renderizado de secciones de ficha de carta, Marsella
 * "El Código de las Cartas"
 *
 * Responsabilidad: renderSeccionesCarta(carta, orientacion) → HTML.
 * NO hace fetch() — recibe el objeto carta ya cargado por data-marsella.js
 * (Sección 10.1: solo data-*.js hace fetch).
 *
 * USO: modal de detalle de arcanos.html (Sección 7.5) — Toggle Recta/Invertida
 * + 6 secciones (las 6 que renderiza esta función) + navegación prev/next.
 * NO se usa dentro de veredicto-marsella.html: el Bloque 1 de resultado
 * (Sección 7.2) muestra un subconjunto distinto de campos — solo el área de
 * consulta del tema activo de la tirada, no las 10 áreas completas — y se
 * construye aparte dentro de resultado-marsella.js.
 *
 * Campos mostrados/ocultos según la Tabla de la Sección 8.2/3.3 del Documento
 * Maestro (verificada campo a campo contra cartas-marsella.json real, 8/8/2026):
 *   - Ocultos siempre: numero_arabigo, id_arcano_mayor_numerico_rel, slug,
 *     tipo, palo, simbolismo, simbolos_iconograficos, relacion_numeral,
 *     relacion_palo, jerarquia_figura, arcano_mayor_numerico,
 *     triada_numerologica, polaridad_palo — existen en el JSON pero se usan
 *     internamente (filtrado, chunking de combinaciones, etc.), no se pintan.
 *   - "caracteristicas", "direccion_mirada", "descripcion_iconografica" y
 *     "ley_miradas_temporal" son campos ÚNICOS (sin variante _recta/_inv).
 *   - Marsella NO tiene esencia_recta/inv ni actividades_sugeridas_recta/inv
 *     (a diferencia de RWS) — confirmado contra los 61 campos reales.
 *
 * Exports: renderSeccionesCarta(carta, orientacion)
 */

// ── HELPERS INTERNOS ─────────────────────────────────────────────────────────

function _esc(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Devuelve el valor de un campo con variante _recta/_inv según orientación.
 * @param {object} carta
 * @param {string} base — nombre base del campo, ej: "amor"
 * @param {string} orientacion — "recta" | "invertida"
 * @returns {string|undefined}
 */
function _campoOrientado(carta, base, orientacion) {
  const sufijo = orientacion === 'invertida' ? '_inv' : '_recta';
  return carta[`${base}${sufijo}`];
}

function _datoItem(label, valor) {
  if (!valor && valor !== 0) return '';
  return `
    <div class="dato-item">
      <span class="dato-label">${_esc(label)}</span>
      <span class="dato-valor">${_esc(valor)}</span>
    </div>`;
}

function _bloque(titulo, items) {
  const filas = items.map(it => _datoItem(it.label, it.valor)).filter(Boolean).join('');
  if (!filas) return '';
  return `
      <section class="mt-4">
        <h3 style="margin-bottom:var(--space-2); font-family:'Cinzel',serif; font-size:0.85rem;
                   font-weight:700; letter-spacing:0.1em; text-transform:uppercase;
                   color:var(--secondary); padding-bottom:var(--space-1);
                   border-bottom:1px solid rgba(201,168,76,0.15);">${_esc(titulo)}</h3>
        <div class="datos-grid">${filas}</div>
      </section>`;
}

// ── EXPORT PÚBLICO ────────────────────────────────────────────────────────────

/**
 * Renderiza todas las secciones de la ficha de una carta de Marsella,
 * organizadas en bloques según la Tabla de la Sección 3.3 del Documento
 * Maestro. Usado tanto en detalle-carta-marsella.html como en el panel de
 * carta dentro de veredicto-marsella.html.
 *
 * @param {object} carta       — objeto de cartas-marsella.json (vía data-marsella.js)
 * @param {string} orientacion — "recta" | "invertida"
 * @returns {string} HTML listo para inyectar
 *
 * @example
 * const carta = await getCartaById(1);
 * const html = renderSeccionesCarta(carta, 'recta');
 */
export function renderSeccionesCarta(carta, orientacion) {
  if (!carta) {
    return `
      <div class="empty-state">
        <i class="ph ph-warning" aria-hidden="true"></i>
        <p>No se pudo cargar la información de esta carta.</p>
      </div>`;
  }

  const esInvertida = orientacion === 'invertida';
  const c = (base) => _campoOrientado(carta, base, orientacion);

  return `
    <div>

      <!-- IDENTIFICACIÓN DEL ARCANO ─────────────────────────────────── -->
      <div style="padding-bottom:var(--space-3); margin-bottom:var(--space-2);
                  border-bottom:1px solid rgba(201,168,76,0.15);">
        <h2 style="font-family:'Cinzel',serif; font-size:clamp(1.1rem,3vw,1.4rem);
                   font-weight:700; color:var(--text-main); margin:0 0 var(--space-1) 0;">
          ${_esc(carta.arcano_es)}
          ${esInvertida ? '<span style="font-size:0.7em; color:var(--text-muted); font-weight:400;"> (Invertida)</span>' : ''}
        </h2>
        <div class="cluster" style="gap:var(--space-1); margin-top:var(--space-1);">
          ${carta.numero_original !== undefined && carta.numero_original !== null
            ? `<span class="badge-tipo">${_esc(carta.numero_original)}</span>` : ''}
          ${carta.elemento ? `<span class="badge-tipo">${_esc(String(carta.elemento).split(':')[0].trim())}</span>` : ''}
        </div>
        ${carta.caracteristicas ? `
        <p class="dato-label" style="margin:var(--space-2) 0 2px 0;">Esencia de la carta</p>
        <p style="color:var(--text-main); line-height:1.7; margin:0; font-size:0.95rem;">
          ${_esc(carta.caracteristicas)}
        </p>` : ''}
      </div>

      <!-- IDENTIFICACIÓN DEL ARCANO (campos que faltaban por mostrarse) -->
      ${_bloque('Identificación del arcano', [
        { label: 'Numeración clásica', valor: carta.numero_original },
        { label: 'Tipo de Arcano',     valor: carta.tipo },
        { label: 'Palo',               valor: carta.palo },
        { label: 'Elemento',           valor: carta.elemento },
      ])}

      <!-- RESUMEN RÁPIDO ────────────────────────────────────────────── -->
      ${_bloque('Resumen rápido', [
        { label: 'Palabras asociadas',        valor: c('palabras_clave') },
        { label: 'Respuesta rápida: Sí o No', valor: c('respuesta_corta') },
      ])}

      <!-- CARACTERÍSTICAS E INTERPRETACIÓN NARRATIVA ─────────────────── -->
      <!-- NOTA 29/9/2026: la tabla que dio Kiko para Marsella solo listaba
           tendencia/presencia en esta sección (sin 'aspectos_personalidad').
           Se mantiene 'Personalidad' igual que en RWS porque el campo existe
           en cartas-marsella.json con contenido real y quitarlo sería perder
           información de la ficha "completa" que pidió — probable olvido al
           transcribir la tabla, no una exclusión a propósito. Avisar si no
           es lo que se quería. -->
      ${_bloque('Características e interpretación narrativa', [
        { label: 'Dirección de los acontecimientos', valor: c('tendencia') },
        { label: 'Cómo se manifiesta',                valor: c('presencia') },
        { label: 'Personalidad',                      valor: c('aspectos_personalidad') },
      ])}

      <!-- ÁREAS DE CONSULTA ─────────────────────────────────────────── -->
      ${_bloque('Áreas de consulta', [
        { label: 'Amor y vínculos',          valor: c('amor') },
        { label: 'Expresión creativa',        valor: c('creatividad') },
        { label: 'Crisis y transformación',   valor: c('crisis_transformacion') },
        { label: 'Decisiones',                valor: c('decisiones') },
        { label: 'Espiritualidad',             valor: c('espiritualidad') },
        { label: 'Familia y hogar',            valor: c('familia_hogar') },
        { label: 'Finanzas y trabajo',         valor: c('finanzas_trabajo') },
        { label: 'Lectura general',            valor: c('general_sino') },
        { label: 'Salud',                      valor: c('salud') },
        { label: 'Viajes y cambios',           valor: c('viajes_mudanzas') },
      ])}

      <!-- GUÍA PRÁCTICA ─────────────────────────────────────────────── -->
      ${_bloque('Guía práctica', [
        { label: 'Siguiente paso',   valor: c('proximo_paso') },
        { label: 'Atención',         valor: c('alerta') },
        { label: 'Marco temporal',   valor: c('tiempo') },
        { label: 'Entorno',          valor: c('lugar') },
        { label: 'Dinámica',         valor: c('dinamica') },
      ])}

      <!-- ICONOGRAFÍA ───────────────────────────────────────────────── -->
      ${_bloque('Iconografía', [
        { label: 'Orientación de la mirada', valor: carta.direccion_mirada },
        { label: 'Escena representada',      valor: carta.descripcion_iconografica },
        { label: 'Lectura simbólica',        valor: carta.simbolismo },
        { label: 'Elementos simbólicos',     valor: carta.simbolos_iconograficos },
        { label: 'Estructura numerológica',  valor: carta.relacion_numeral },
        { label: 'Influencia del palo',      valor: carta.relacion_palo },
        { label: 'Perspectiva temporal',     valor: carta.ley_miradas_temporal },
      ])}

      <!-- ESTRUCTURA NUMEROLÓGICA Y ELEMENTAL ─────────────────────────── -->
      ${_bloque('Estructura numerológica y elemental', [
        { label: 'Jerarquía de la figura', valor: carta.jerarquia_figura },
        { label: 'Arcano asociado',        valor: carta.arcano_mayor_numerico },
        { label: 'Ciclo evolutivo',        valor: carta.triada_numerologica },
        { label: 'Afinidad elemental',     valor: carta.polaridad_palo },
      ])}

    </div>`;
}
