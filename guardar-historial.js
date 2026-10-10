/**
 * @file guardar-historial.js
 * @description Compartido por veredicto-marsella.js y veredicto-rws.js.
 *   Sin sesión → abre el modal ya existente de auth-widget.js y guarda
 *   automático apenas el login resuelve. Con sesión → guarda directo.
 */

import { getUsuarioActual, onCambioAuth } from './auth.js';
import { guardarLectura, actualizarLectura } from './historial.js';
import { mostrarToast } from './main.js';
import { leerFormularioConsulta } from './formulario-consulta.js';

// Firestore rechaza documentos de más de 1 MiB (1.048.576 bytes). Se deja margen.
const LIMITE_BYTES_DOC = 1000000;

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
 * @param {() => Promise<{vistaEstudioHtml:string, vistaLecturaHtml:string, lecturaGenerada:boolean}>} datos.obtenerVistas
 *   Devuelve las vistas que EXISTEN: la de estudio siempre; la de lectura solo si
 *   la persona la abrió (nunca se genera con IA al guardar).
 * @param {string|null} [datos.lecturaId] — si ya se guardó antes, se actualiza esa misma ficha
 * @param {(id:string) => void} [datos.onGuardada] — avisa el id de la ficha guardada
 * @returns {Promise<void>} se resuelve cuando termina el guardado (o el intento)
 */
export function guardarLecturaActual(datos) {
  const usuario = getUsuarioActual();

  const _guardar = async (uid) => {
    let vistas = { vistaEstudioHtml: '', vistaLecturaHtml: '', lecturaGenerada: false };
    try {
      vistas = await datos.obtenerVistas();
    } catch (err) {
      console.error('[guardar-historial] No se pudieron obtener las vistas:', err);
    }

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
        posicion: c.posicionCodigo || `C${i + 1}`,
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
      // Vistas del veredicto. `resultadoHtml` (un solo bloque) solo existe en
      // lecturas guardadas antes de este cambio; historial.html lo sigue leyendo.
      vistaEstudioHtml: vistas.vistaEstudioHtml,
      vistaLecturaHtml: vistas.vistaLecturaHtml,
      lecturaGenerada: vistas.lecturaGenerada,
      // Formulario del consultante (contexto, etiquetas, notas, ánimo…)
      consulta: leerFormularioConsulta(),
    };

    const bytes = new Blob([JSON.stringify(lectura)]).size;
    if (bytes > LIMITE_BYTES_DOC) {
      console.error('[guardar-historial] Lectura demasiado grande:', bytes, 'bytes');
      mostrarToast('Esta lectura es demasiado grande para guardarla.', 'error');
      return;
    }
    try {
      let id = datos.lecturaId || null;
      if (id) {
        await actualizarLectura(uid, id, lectura);
      } else {
        id = await guardarLectura(uid, lectura);
        datos.onGuardada?.(id);
      }
      const vistasTxt = vistas.lecturaGenerada ? 'con las dos vistas' : 'con la vista de estudio';
      mostrarToast(
        datos.lecturaId ? `Lectura actualizada en tu historial (${vistasTxt}).`
                        : `Lectura guardada en tu historial (${vistasTxt}).`,
        'ok'
      );
    } catch (err) {
      console.error('[guardar-historial] Error:', err);
      mostrarToast('No se pudo guardar. Probá de nuevo.', 'error');
    }
  };

  if (usuario) {
    return _guardar(usuario.uid);
  }

  // Sin sesión: abrir modal y guardar automático apenas resuelva el login
  _abrirModalLogin();
  // (No se espera el login: si la persona cierra el modal sin entrar, el
  // botón de guardar no debe quedar bloqueado.)
  const desuscribir = onCambioAuth((user) => {
    if (user) {
      desuscribir();
      _guardar(user.uid);
    }
  });
  return Promise.resolve();
}
