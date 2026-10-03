/**
 * @file historial.js
 * @description Wrapper de Firestore para el historial de lecturas — cada
 *   usuario tiene su propia subcolección `usuarios/{uid}/lecturas`, nunca
 *   una colección plana compartida (esto es lo que permite que las reglas
 *   de seguridad de Firestore, Sección 14.4, sean tan simples como "solo
 *   el dueño del uid lee/escribe ahí").
 *
 * Se guarda todo (decisión confirmada 16/8/2026): cartas completas con
 * orientación, combinaciones detectadas entre pares únicos, y el texto ya
 * generado de la conclusión — no solo los ids, para que abrir una lectura
 * guardada no dependa de que los datos de la carta no hayan cambiado
 * entre el momento de guardar y el de volver a verla.
 *
 * @exports guardarLectura, getHistorialUsuario, eliminarLectura
 */

import { db } from './firebase-init.js';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

function _coleccionUsuario(uid) {
  return collection(db, 'usuarios', uid, 'lecturas');
}

/**
 * Guarda una lectura completa en el historial del usuario.
 *
 * @param {string} uid
 * @param {object} lectura
 * @param {'marsella'|'rws'} lectura.tradicion
 * @param {string} lectura.mazo
 * @param {string} lectura.tema
 * @param {string} lectura.nombreTirada
 * @param {Array<{id:number, slug:string, arcano_es:string, orientacion:string, posicion:string}>} lectura.cartas
 * @param {Array<{carta1:string, carta2:string, clasificacion:string, interpretacion:string, consejo:string}>} lectura.combinaciones
 *   — `clasificacion` es `tipo` en Marsella o `dinamica` en RWS (nombre
 *   neutro, definido 24/8/2026 — evita mezclar dos campos con significado
 *   distinto entre mazos bajo el nombre `tipo`).
 * @param {string} lectura.resultadoHtml — HTML renderizado de Respuesta +
 *   Parte A + Parte B + Parte C (renombrado 24/8/2026; antes `conclusionHtml`
 *   apuntaba al Bloque 3 / Conclusión, que ya no existe en el diseño nuevo)
 * @returns {Promise<string>} id del documento creado
 */
export async function guardarLectura(uid, lectura) {
  const ref = await addDoc(_coleccionUsuario(uid), {
    ...lectura,
    timestamp: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Devuelve todas las lecturas guardadas del usuario, más reciente primero.
 * @param {string} uid
 * @returns {Promise<Array<object>>}
 */
export async function getHistorialUsuario(uid) {
  const q = query(_coleccionUsuario(uid), orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Borra una lectura guardada.
 * @param {string} uid
 * @param {string} lecturaId
 */
export async function eliminarLectura(uid, lecturaId) {
  await deleteDoc(doc(db, 'usuarios', uid, 'lecturas', lecturaId));
}
