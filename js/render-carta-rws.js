/**
 * render-carta-rws.js — Renderizado de secciones de ficha de carta, RWS
 * "El Código de las Cartas"
 *
 * Responsabilidad: renderSeccionesCarta(carta, orientacion) → HTML.
 * NO hace fetch() — recibe el objeto carta ya cargado por data-rws.js
 * (Sección 10.1: solo data-*.js hace fetch).
 *
 * USO: modal de detalle de arcanos.html (Sección 7.5) — Toggle Recta/Invertida
 * + 6 secciones (las 6 que renderiza esta función) + navegación prev/next.
 * NO se usa dentro de veredicto-rws.html: el Bloque 1 de resultado
 * (Sección 7.2) muestra un subconjunto distinto de campos — solo el área de
 * consulta del tema activo de la tirada, no las 10 áreas completas — y se
 * construye aparte dentro de resultado-rws.js.
 *
 * Campos mostrados/ocultos según la Tabla de la Sección 8.1/3.3 del Documento
 * Maestro (verificada campo a campo contra cartas-rws.json real, 64 campos, 8/8/2026):
 *   - Ocultos siempre: slug, aspecto_fisico_gd, simbolismo, simbolos_iconograficos,
 *     relacion_numeral, relacion_palo, numerologia_universal, velocidad_carta,
 *     es_carta_quiebre — existen en el JSON pero se usan internamente
 *     (chunking, filtrado, etc.), no se pintan.
 *   - "elemento_rds", "numero_rds", "palo_rds" son campos con sufijo propio de
 *     RWS (confirmado — Marsella usa "elemento"/"numero_original"/"palo" sin
 *     sufijo). "tipo" y "palo_rds" NO se muestran según la tabla, aunque
 *     existen en el JSON.
 *   - A diferencia de Marsella, RWS SÍ tiene esencia_recta/inv (bloque
 *     Características) y actividades_sugeridas/_inv (bloque Guía práctica —
 *     nombre de campo IRREGULAR, ver _actividadesSugeridas() más abajo) —
 *     confirmado contra los 64 campos reales.
 *   - direccion_mirada, descripcion_iconografica son campos únicos (sin
 *     variante _recta/_inv). ley_miradas_temporal existe en el JSON de RWS
 *     pero NO se muestra (a diferencia de Marsella, donde sí se muestra).
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

/**
 * Caso especial: "actividades_sugeridas" es el único campo de cartas-rws.json
 * cuya variante recta NO lleva sufijo "_recta" (es solo "actividades_sugeridas"),
 * mientras que la invertida sí lleva "_inv" — confirmado contra el JSON real
 * (8/8/2026). El resto de campos siguen el patrón regular _recta/_inv.
 * @param {object} carta
 * @param {string} orientacion — "recta" | "invertida"
 * @returns {string|undefined}
 */
function _actividadesSugeridas(carta, orientacion) {
  return orientacion === 'invertida'
    ? carta.actividades_sugeridas_inv
    : carta.actividades_sugeridas;
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
 * Renderiza todas las secciones de la ficha de una carta de RWS, organizadas
 * en bloques según la Tabla de la Sección 3.3 del Documento Maestro. Usado
 * tanto en detalle-carta-rws.html como en el panel de carta dentro de
 * veredicto-rws.html.
 *
 * @param {object} carta       — objeto de cartas-rws.json (vía data-rws.js)
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
          ${carta.numero_rds !== undefined && carta.numero_rds !== null
            ? `<span class="badge-tipo">${_esc(carta.numero_rds)}</span>` : ''}
          ${carta.palo_rds ? `<span class="badge-tipo">${_esc(String(carta.palo_rds).split(':')[0].trim())}</span>` : ''}
          ${carta.elemento_rds ? `<span class="badge-tipo">${_esc(String(carta.elemento_rds).split(':')[0].trim())}</span>` : ''}
        </div>
        ${c('caracteristicas') ? `
        <p class="dato-label" style="margin:var(--space-2) 0 2px 0;">Esencia de la carta</p>
        <p style="color:var(--text-main); line-height:1.7; margin:0; font-size:0.95rem;">
          ${_esc(c('caracteristicas'))}
        </p>` : ''}
      </div>

      <!-- IDENTIFICACIÓN DEL ARCANO (campos que faltaban por mostrarse) -->
      ${_bloque('Identificación del arcano', [
        { label: 'Numeración clásica', valor: carta.numero_rds },
        { label: 'Tipo de Arcano',     valor: carta.tipo },
        { label: 'Palo',               valor: carta.palo_rds },
        { label: 'Elemento',           valor: carta.elemento_rds },
      ])}

      <!-- RESUMEN RÁPIDO ────────────────────────────────────────────── -->
      ${_bloque('Resumen rápido', [
        { label: 'Palabras asociadas',            valor: c('palabras_clave') },
        { label: 'Respuesta rápida: Sí o No',      valor: c('respuesta_corta') },
      ])}

      <!-- CARACTERÍSTICAS E INTERPRETACIÓN NARRATIVA ─────────────────── -->
      ${_bloque('Características e interpretación narrativa', [
        { label: 'Tendencia',           valor: c('tendencia') },
        { label: 'Presencia',           valor: c('presencia') },
        { label: 'Verdad arquetípica',  valor: c('esencia') },
        { label: 'Personalidad',        valor: c('aspectos_personalidad') },
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
        { label: 'Siguiente paso',       valor: c('proximo_paso') },
        { label: 'Atención',             valor: c('alerta') },
        { label: 'Marco temporal',       valor: c('tiempo') },
        { label: 'Entorno',              valor: c('lugar') },
        { label: 'Dinámica',             valor: c('dinamica') },
        { label: 'Actividades sugeridas',valor: _actividadesSugeridas(carta, orientacion) },
      ])}

      <!-- ICONOGRAFÍA ───────────────────────────────────────────────── -->
      ${_bloque('Iconografía', [
        { label: 'Aspecto físico',           valor: carta.aspecto_fisico_gd },
        { label: 'Escena representada',      valor: carta.descripcion_iconografica },
        { label: 'Simbolismo',               valor: carta.simbolismo },
        { label: 'Símbolos clave',           valor: carta.simbolos_iconograficos },
        { label: 'Significado del número',   valor: carta.relacion_numeral },
        { label: 'Relación con el palo',     valor: carta.relacion_palo },
        { label: 'Orientación de la mirada', valor: carta.direccion_mirada },
        { label: 'Perspectiva temporal',     valor: carta.ley_miradas_temporal },
      ])}

      <!-- ESTRUCTURA NUMEROLÓGICA Y TEMPORAL ──────────────────────────── -->
      ${_bloque('Estructura numerológica y temporal', [
        { label: 'Numerología',           valor: carta.numerologia_universal },
        { label: 'Velocidad energética',  valor: carta.velocidad_carta },
        { label: 'Carta de quiebre',      valor: carta.es_carta_quiebre },
      ])}

    </div>`;
}
