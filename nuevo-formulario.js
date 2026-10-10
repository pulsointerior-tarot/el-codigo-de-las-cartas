/**
 * @file nuevo-formulario.js
 * @description Formulario que el consultante completa al pie del veredicto
 *   (compartido por veredicto-marsella.js y veredicto-rws.js). Vive FUERA
 *   del contenedor que cambia al alternar "Vista de lectura" / "Vista de
 *   estudio", así que lo escrito no se pierde al cambiar de vista.
 *
 *   Campos (definidos con Kiko, 5/10/2026): fecha y hora automática,
 *   contexto de la consulta, etiquetas, interpretación personal, notas
 *   libres, observaciones durante la lectura, carta o posición que llamó
 *   la atención y estado de ánimo (opciones fijas). Los cuadros de texto
 *   no tienen límite de caracteres.
 *
 * @exports ETIQUETAS_BASE, ESTADOS_ANIMO, renderFormularioConsulta,
 *   conectarFormularioConsulta, leerFormularioConsulta, mostrarEstadoVistas
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

function _esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function _fechaHoraAhora() {
  return new Date().toLocaleString('es', { dateStyle: 'long', timeStyle: 'short' });
}

function _area(id, etiqueta, ayuda) {
  return `
    <div class="formulario-consulta__campo">
      <label for="${id}" class="formulario-consulta__etiqueta">${etiqueta}</label>
      ${ayuda ? `<p class="formulario-consulta__ayuda">${ayuda}</p>` : ''}
      <textarea id="${id}" class="formulario-consulta__area" rows="5"></textarea>
    </div>`;
}

/** @returns {string} HTML del formulario (se inserta al final del veredicto). */
export function renderFormularioConsulta() {
  return `
    <section class="formulario-consulta" id="formulario-consulta" aria-labelledby="formulario-consulta-titulo">
      <h2 id="formulario-consulta-titulo">Mis notas de esta consulta</h2>
      <p class="formulario-consulta__ayuda">
        Todo esto es opcional. Se guarda junto con la lectura cuando pulsás "Guardar en historial".
      </p>

      <div class="formulario-consulta__campo">
        <span class="formulario-consulta__etiqueta">Fecha y hora</span>
        <p class="formulario-consulta__fecha">${_esc(_fechaHoraAhora())}
          <span class="formulario-consulta__ayuda">(se registra sola al guardar)</span></p>
      </div>

      ${_area('fc-contexto', 'Contexto de la consulta', 'Qué estaba ocurriendo cuando se hizo la lectura.')}

      <div class="formulario-consulta__campo">
        <span class="formulario-consulta__etiqueta" id="fc-etiquetas-label">Etiquetas</span>
        <div class="formulario-consulta__chips" role="group" aria-labelledby="fc-etiquetas-label">
          ${ETIQUETAS_BASE.map((e, i) => `
            <label class="formulario-consulta__chip">
              <input type="checkbox" name="fc-etiqueta" value="${_esc(e)}" id="fc-etiqueta-${i}">
              <span>${_esc(e)}</span>
            </label>`).join('')}
        </div>
        <input type="text" id="fc-etiquetas-otras" class="formulario-consulta__linea"
               placeholder="Otras etiquetas, separadas por coma">
      </div>

      ${_area('fc-interpretacion', 'Interpretación personal del lector')}
      ${_area('fc-notas', 'Notas libres')}
      ${_area('fc-observaciones', 'Observaciones durante la lectura')}
      ${_area('fc-carta-destacada', 'Carta o posición que llamó especialmente la atención')}

      <div class="formulario-consulta__campo">
        <span class="formulario-consulta__etiqueta" id="fc-animo-label">Estado de ánimo</span>
        <div class="formulario-consulta__chips" role="radiogroup" aria-labelledby="fc-animo-label">
          ${ESTADOS_ANIMO.map((e, i) => `
            <label class="formulario-consulta__chip">
              <input type="radio" name="fc-animo" value="${_esc(e)}" id="fc-animo-${i}">
              <span>${_esc(e)}</span>
            </label>`).join('')}
        </div>
      </div>

      <p id="fc-estado-vistas" class="formulario-consulta__ayuda" role="status" aria-live="polite">
        ${TEXTOS_ESTADO['solo-estudio']}
      </p>

      <div class="acciones">
        <button id="btn-guardar-historial-form" type="button" class="btn btn--primary">
          Guardar en historial
        </button>
      </div>
    </section>`;
}

/**
 * Conecta el botón de guardar del formulario. Llamar una sola vez, después
 * de insertar el HTML en la página.
 * @param {() => void} onGuardar
 */
export function conectarFormularioConsulta(onGuardar) {
  document.getElementById('btn-guardar-historial-form')?.addEventListener('click', onGuardar);
}

function _valor(id) {
  return document.getElementById(id)?.value ?? '';
}

/**
 * Lee el estado actual del formulario. Siempre devuelve strings/arrays
 * (nunca undefined — Firestore rechaza `undefined`).
 * @returns {{
 *   fechaHora: string, contexto: string, etiquetas: string[],
 *   interpretacionPersonal: string, notasLibres: string, observaciones: string,
 *   cartaDestacada: string, estadoAnimo: string
 * }}
 */
export function leerFormularioConsulta() {
  const marcadas = [...document.querySelectorAll('input[name="fc-etiqueta"]:checked')].map(i => i.value);
  const otras = _valor('fc-etiquetas-otras')
    .split(',')
    .map(s => s.trim().slice(0, 40))
    .filter(Boolean);
  const etiquetas = [...new Set([...marcadas, ...otras])];

  return {
    fechaHora: new Date().toISOString(),
    contexto: _valor('fc-contexto'),
    etiquetas,
    interpretacionPersonal: _valor('fc-interpretacion'),
    notasLibres: _valor('fc-notas'),
    observaciones: _valor('fc-observaciones'),
    cartaDestacada: _valor('fc-carta-destacada'),
    estadoAnimo: document.querySelector('input[name="fc-animo"]:checked')?.value ?? '',
  };
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
