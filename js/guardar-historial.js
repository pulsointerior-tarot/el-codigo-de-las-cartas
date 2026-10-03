/**
 * @file guardar-historial.js
 * @description Compartido por veredicto-marsella.js y veredicto-rws.js.
 *   Sin sesión → abre el modal ya existente de auth-widget.js y guarda
 *   automático apenas el login resuelve. Con sesión → guarda directo.
 */

import { getUsuarioActual, onCambioAuth } from './auth.js';
import { guardarLectura } from './historial.js';
import { mostrarToast } from './main.js';

function _abrirModalLogin() {
  const overlay = document.getElementById('auth-modal-overlay');
  if (overlay) overlay.style.display = 'flex';
}

/**
 * @param {object} datos
 * @param {'marsella'|'rws'} datos.tradicion
 * @param {object} datos.tirada
 * @param {Array<object>} datos.cartas
 * @param {Array<{carta1, carta2, combinacion}>} datos.pares
 * @param {string} datos.tema
 */
export function guardarLecturaActual(datos) {
  const usuario = getUsuarioActual();

  const _guardar = async (uid) => {
    const lectura = {
      tradicion: datos.tradicion,
      mazo: datos.tradicion === 'rws' ? 'rwst1' : 'marst1',
      tema: datos.tema,
      nombreTirada: datos.tirada?.nombre_tirada || '',
      cartas: datos.cartas.map((c, i) => ({
        id: c.id,
        slug: c.slug,
        arcano_es: c.arcano_es,
        orientacion: c.orientacion,
        posicion: `C${i + 1}`,
      })),
      combinaciones: datos.pares.filter(p => p.combinacion).map(p => ({
        carta1: p.carta1.arcano_es,
        carta2: p.carta2.arcano_es,
        // nombre neutro: `tipo` en Marsella, `dinamica` en RWS (definido
        // 24/8/2026 — evita el bug de mezclar dos campos con significado
        // distinto entre mazos bajo un mismo nombre)
        clasificacion: datos.tradicion === 'rws' ? p.combinacion.dinamica : p.combinacion.tipo,
        interpretacion: p.combinacion.interpretacion || '',
        consejo: datos.tradicion === 'rws' ? p.combinacion.comb_consejo : p.combinacion.comb_consejos,
      })),
      resultadoHtml: document.getElementById('contenido-veredicto')?.innerHTML || '',
    };
    try {
      await guardarLectura(uid, lectura);
      mostrarToast('Lectura guardada en tu historial.', 'ok');
    } catch (err) {
      console.error('[guardar-historial] Error:', err);
      mostrarToast('No se pudo guardar. Probá de nuevo.', 'error');
    }
  };

  if (usuario) {
    _guardar(usuario.uid);
    return;
  }

  // Sin sesión: abrir modal y guardar automático apenas resuelva el login
  _abrirModalLogin();
  const desuscribir = onCambioAuth((user) => {
    if (user) {
      desuscribir();
      _guardar(user.uid);
    }
  });
}
