/**
 * @file nuevo-formulario.js
 * @description Piezas compartidas del veredicto: bloque de guardado (aviso de qué
 *   vistas se guardarán + botón), listas de etiquetas y estados de ánimo (las usan
 *   las notas del historial) y el encabezado de carta con su posición.
 *
 *   Las NOTAS ya no están en el veredicto: se completan desde Mi Historial
 *   (ver nuevo-notas.js).
 *
 * @exports ETIQUETAS_BASE, ESTADOS_ANIMO, mostrarEstadoVistas, renderBloqueGuardar,
 *   conectarBloqueGuardar, renderEncabezadoPosicion
 */

export const ETIQUETAS_BASE = [
  'Trabajo', 'Amor', 'Dinero', 'Familia', 'Crecimiento',
  'Salud', 'Amistad', 'Estudios', 'Vivienda', 'Espiritualidad',
];

export const ESTADOS_ANIMO = [
  'Sereno/a', 'Esperanzado/a', 'Confundido/a', 'Preocupado/a', 'Triste', 'Enfadado/a',
];

const TEXTOS_ESTADO = {
  'solo-estudio': 'Se guardará: <strong>Vista de estudio</strong>. Para guardar también la vista de lectura, pincha "Vista de lectura" arriba y espera a que termine de generarse.',
  'generando':    'Generando la vista de lectura… espera a que termine para guardar las dos vistas.',
  'dos':          'Se guardarán: <strong>Vista de estudio + Vista de lectura</strong>.',
  'fallo':        'La vista de lectura no se pudo generar. Se guardará solo la <strong>Vista de estudio</strong>.',
};

/**
 * Actualiza el aviso que dice qué vistas se guardarán al pulsar Guardar.
 * @param {'solo-estudio'|'generando'|'dos'|'fallo'} estado
 */
export function mostrarEstadoVistas(estado) {
  const el = document.getElementById('fc-estado-vistas');
  if (el && TEXTOS_ESTADO[estado]) el.innerHTML = TEXTOS_ESTADO[estado];
}

/** @returns {string} HTML del bloque de guardado (al final del veredicto). */
export function renderBloqueGuardar() {
  return `
    <section class="guardar-lectura" id="guardar-lectura">
      <p id="fc-estado-vistas" class="formulario-consulta__ayuda" role="status" aria-live="polite">
        ${TEXTOS_ESTADO['solo-estudio']}
      </p>
      <p class="formulario-consulta__ayuda">
        Las notas las puedes añadir después, abriendo la lectura en Mi Historial.
      </p>
      <div class="acciones">
        <button id="btn-guardar-historial-form" type="button" class="btn btn--primary">
          Guardar en historial
        </button>
      </div>
    </section>`;
}

/**
 * Conecta el botón de guardar. Llamar una sola vez, tras insertar el HTML.
 * @param {() => (void|Promise<void>)} onGuardar
 */
export function conectarBloqueGuardar(onGuardar) {
  document.getElementById('btn-guardar-historial-form')?.addEventListener('click', onGuardar);
}

/**
 * Encabezado de una carta dentro del veredicto: arriba la posición con su
 * significado ("C1 — Energía de la primera opción/persona") y debajo el
 * nombre de la carta con su orientación ("REINE DE ÉPÉES (recta)").
 * Compartido por la Vista de lectura y la Vista de estudio, en ambos mazos.
 *
 * @param {object} o
 * @param {string} o.codigo        — "C1", "C2"…
 * @param {string} o.significado   — significado de la posición ('' si no hay)
 * @param {string} o.subtitulo     — nombre de la carta + orientación
 * @param {string} [o.claseSub]    — clase CSS del subtítulo
 * @returns {string} HTML
 */
export function renderEncabezadoPosicion({ codigo, significado, subtitulo, claseSub = 'carta-subtitulo' }) {
  const esc = (t) => { const d = document.createElement('div'); d.textContent = t ?? ''; return d.innerHTML; };
  const titulo = significado ? `${esc(codigo)} — ${esc(significado)}` : esc(codigo);
  return `<h3>${titulo}</h3><p class="${claseSub}">${esc(subtitulo)}</p>`;
}
