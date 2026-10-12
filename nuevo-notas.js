/**
 * @file nuevo-notas.js
 * @description Notas del consultante, dentro de cada lectura de Mi Historial.
 *   Se completan DESPUÉS de guardar la lectura: abres la lectura en el historial,
 *   escribes y pulsas "Guardar notas". Se guardan en el campo `consulta` de la misma
 *   ficha (no crea otra), sin tocar las vistas guardadas.
 *
 *   Campos: contexto de la consulta, etiquetas, interpretación personal, notas libres,
 *   observaciones durante la lectura, carta o posición que llamó la atención y estado
 *   de ánimo (opciones fijas). Los cuadros de texto no tienen límite de caracteres.
 *
 * @exports renderFormularioNotas, conectarFormulariosNotas
 */

import { db } from './js/firebase-init.js';
import { doc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { ETIQUETAS_BASE, ESTADOS_ANIMO } from './nuevo-formulario.js';

function _esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function _area(campo, etiqueta, valor, ayuda) {
  return `
    <div class="formulario-consulta__campo">
      <label class="formulario-consulta__etiqueta">${etiqueta}</label>
      ${ayuda ? `<p class="formulario-consulta__ayuda">${ayuda}</p>` : ''}
      <textarea class="formulario-consulta__area" data-campo="${campo}" rows="5">${_esc(valor)}</textarea>
    </div>`;
}

/**
 * HTML del formulario de notas de UNA lectura guardada, con lo ya guardado.
 * @param {string} id  id de la lectura en Firestore
 * @param {object} [c] campo `consulta` guardado (puede no existir)
 */
export function renderFormularioNotas(id, c = {}) {
  c = c || {};
  const guardadas = Array.isArray(c.etiquetas) ? c.etiquetas : [];
  const otras = guardadas.filter(e => !ETIQUETAS_BASE.includes(e)).join(', ');
  const idSeguro = _esc(id);
  return `
    <section class="formulario-consulta" data-notas-id="${idSeguro}">
      <h3 style="font-family:'Cinzel',serif; color: var(--secondary); font-size: 0.95rem; margin-bottom: var(--space-1);">Mis notas de esta consulta</h3>
      <p class="formulario-consulta__ayuda">Todo es opcional. Escribe lo que quieras y pulsa «Guardar notas».</p>

      ${_area('contexto', 'Contexto de la consulta', c.contexto, 'Qué estaba ocurriendo cuando se hizo la lectura.')}

      <div class="formulario-consulta__campo">
        <span class="formulario-consulta__etiqueta">Etiquetas</span>
        <div class="formulario-consulta__chips" role="group" aria-label="Etiquetas">
          ${ETIQUETAS_BASE.map(e => `
            <label class="formulario-consulta__chip">
              <input type="checkbox" data-etq value="${_esc(e)}" ${guardadas.includes(e) ? 'checked' : ''}>
              <span>${_esc(e)}</span>
            </label>`).join('')}
        </div>
        <input type="text" class="formulario-consulta__linea" data-campo="otras" value="${_esc(otras)}"
               placeholder="Otras etiquetas, separadas por coma">
      </div>

      ${_area('interpretacionPersonal', 'Interpretación personal del lector', c.interpretacionPersonal)}
      ${_area('notasLibres', 'Notas libres', c.notasLibres)}
      ${_area('observaciones', 'Observaciones durante la lectura', c.observaciones)}
      ${_area('cartaDestacada', 'Carta o posición que llamó especialmente la atención', c.cartaDestacada)}

      <div class="formulario-consulta__campo">
        <span class="formulario-consulta__etiqueta">Estado de ánimo</span>
        <div class="formulario-consulta__chips" role="radiogroup" aria-label="Estado de ánimo">
          ${ESTADOS_ANIMO.map(e => `
            <label class="formulario-consulta__chip">
              <input type="radio" name="animo-${idSeguro}" data-animo value="${_esc(e)}" ${c.estadoAnimo === e ? 'checked' : ''}>
              <span>${_esc(e)}</span>
            </label>`).join('')}
        </div>
      </div>

      <p class="formulario-consulta__ayuda" data-estado-notas role="status" aria-live="polite"></p>
      <div class="acciones">
        <button type="button" class="btn btn--primary" data-guardar-notas="${idSeguro}">Guardar notas</button>
      </div>
    </section>`;
}

function _leer(sec) {
  const val = (campo) => sec.querySelector(`[data-campo="${campo}"]`)?.value ?? '';
  const marcadas = [...sec.querySelectorAll('input[data-etq]:checked')].map(i => i.value);
  const otras = val('otras').split(',').map(s => s.trim().slice(0, 40)).filter(Boolean);
  return {
    contexto: val('contexto'),
    etiquetas: [...new Set([...marcadas, ...otras])],
    interpretacionPersonal: val('interpretacionPersonal'),
    notasLibres: val('notasLibres'),
    observaciones: val('observaciones'),
    cartaDestacada: val('cartaDestacada'),
    estadoAnimo: sec.querySelector('input[data-animo]:checked')?.value ?? '',
  };
}

/**
 * Activa todos los formularios de notas dentro de `raiz`.
 * @param {HTMLElement} raiz  contenedor del historial
 * @param {string} uid        id del usuario con sesión
 */
export function conectarFormulariosNotas(raiz, uid) {
  raiz.querySelectorAll('section[data-notas-id]').forEach((sec) => {
    const id = sec.dataset.notasId;
    const btn = sec.querySelector('[data-guardar-notas]');
    const estado = sec.querySelector('[data-estado-notas]');
    const avisar = (txt, error) => {
      estado.textContent = txt;
      estado.style.color = error ? 'var(--error, #e5534b)' : 'var(--secondary)';
    };
    const marcarCambios = () => avisar('Hay cambios sin guardar.', false);
    sec.addEventListener('input', marcarCambios);
    sec.addEventListener('change', marcarCambios);

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      avisar('Guardando…', false);
      try {
        const consulta = { ..._leer(sec), actualizadoEn: new Date().toISOString() };
        await updateDoc(doc(db, 'usuarios', uid, 'lecturas', id), {
          consulta,
          notasActualizadas: serverTimestamp(),
        });
        avisar('Notas guardadas.', false);
      } catch (err) {
        console.error('[notas] No se pudieron guardar:', err);
        avisar('No se pudieron guardar las notas. Inténtalo de nuevo.', true);
      } finally {
        btn.disabled = false;
      }
    });
  });
}
