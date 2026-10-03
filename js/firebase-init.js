/**
 * @file firebase-init.js
 * @description Inicialización única de Firebase (Auth + Firestore) para
 *   el subsistema de cuentas e historial — Sección 14 del Documento
 *   Maestro. Es el único módulo que importa el SDK de Firebase
 *   directamente; auth.js e historial.js importan `auth`/`db` desde acá,
 *   nunca inicializan su propia instancia (mismo criterio que Regla 10.1:
 *   una sola fuente de verdad por servicio externo).
 *
 * Configurado con el proyecto real "WEB TAROT" (Firebase project id:
 * web-tarot-b8dfe) — 19/8/2026. Plan Spark (gratis), Firestore edición
 * Standard, Authentication con email/contraseña + Google habilitados,
 * reglas de seguridad publicadas (ver firestore.rules).
 *
 * @exports auth, db
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

// Ninguna de estas claves es secreta — viajan en el HTML público de
// cualquier app web con Firebase, es normal verlas en el código fuente
// del navegador. La seguridad real vive en las reglas de Firestore
// (firestore.rules), no en ocultar esto.
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyD4dEZtvtcmJv3IXcj-EALr__ak7vKJjvU',
  authDomain: 'web-tarot-b8dfe.firebaseapp.com',
  projectId: 'web-tarot-b8dfe',
  storageBucket: 'web-tarot-b8dfe.firebasestorage.app',
  messagingSenderId: '10231949701',
  appId: '1:10231949701:web:a96dec047a3ea9148e7cec',
};

const app = initializeApp(FIREBASE_CONFIG);

export const auth = getAuth(app);
export const db = getFirestore(app);
