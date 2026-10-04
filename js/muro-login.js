/**
 * @file muro-login.js
 * @description Bloquea la página entera hasta que haya una sesión
 *   iniciada con un correo de CORREOS_PERMITIDOS. Añadido 3/10/2026 a
 *   pedido de Kiko — antes, cualquiera con el link podía usar toda la
 *   app (incluida la generación de lecturas con IA) sin loguearse.
 *
 *   IMPORTANTE — esto es solo la parte VISIBLE del bloqueo, pensada
 *   para la experiencia normal de uso. La protección real, la que no
 *   se puede saltear con las herramientas de desarrollador, vive del
 *   lado del servidor en cloudflare-worker/sintesis-respuesta.js, que
 *   verifica el mismo correo de forma independiente antes de llamar a
 *   Gemini. Este archivo NO reemplaza esa protección, la complementa.
 *
 *   CORREOS_PERMITIDOS tiene que coincidir, a mano, con la misma lista
 *   del Worker — no hay forma de compartirla automáticamente entre un
 *   archivo que corre en el navegador y uno que corre en Cloudflare.
 *
 *   Uso: agregar en TODAS las páginas, lo antes posible en <head>,
 *   antes de cualquier otro script:
 *     <script type="module" src="js/muro-login.js"></script>
 *
 * @exports (ninguno — se autoejecuta al cargar)
 */

import { onCambioAuth, cerrarSesion, iniciarSesionConGoogle, mensajeError } from './auth.js';

const CORREOS_PERMITIDOS = ['kekabgm@gmail.com', 'hhjdxz@gmail.com', 'kekainsight@gmail.com', 'pulsointerior24@gmail.com'];

let _overlay = null;

function _crearOverlay() {
  if (_overlay) return _overlay;
  const div = document.createElement('div');
  div.id = 'muro-login';
  div.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: #0A0A0A; color: #F5F0E8;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 1.25rem; padding: 2rem; text-align: center;
    font-family: 'EB Garamond', Georgia, serif;
  `;
  document.documentElement.appendChild(div);
  _overlay = div;
  return div;
}

function _ocultarMuro() {
  if (_overlay) {
    _overlay.remove();
    _overlay = null;
  }
  document.documentElement.style.visibility = '';
}

function _mostrarCargando() {
  document.documentElement.style.visibility = 'hidden';
}

function _mostrarLogin(mensaje) {
  const div = _crearOverlay();
  document.documentElement.style.visibility = '';
  div.innerHTML = `
    <h1 style="font-family:'Cinzel',serif; color:#C9A84C; font-size:1.4rem; margin:0;">El Código de las Cartas</h1>
    <p style="max-width:340px; color:#F5F0E8; opacity:0.85; margin:0;">${mensaje}</p>
    <button id="muro-login-btn" style="
      background:#C9A84C; color:#0A0A0A; border:none; border-radius:6px;
      padding:0.75rem 1.5rem; font-size:1rem; font-weight:600; cursor:pointer;
      font-family:'Source Sans 3',sans-serif;
    ">Iniciar sesión con Google</button>
    <p id="muro-login-error" style="color:#EF5350; font-size:0.85rem; margin:0; min-height:1.2em;"></p>
  `;
  div.querySelector('#muro-login-btn').addEventListener('click', async () => {
    const errorEl = div.querySelector('#muro-login-error');
    errorEl.textContent = '';
    try {
      await iniciarSesionConGoogle();
      // onCambioAuth se dispara solo con el nuevo estado; no hace falta
      // hacer nada más acá.
    } catch (err) {
      errorEl.textContent = mensajeError(err);
    }
  });
}

function _mostrarNoAutorizado(email) {
  const div = _crearOverlay();
  document.documentElement.style.visibility = '';
  div.innerHTML = `
    <h1 style="font-family:'Cinzel',serif; color:#C9A84C; font-size:1.4rem; margin:0;">El Código de las Cartas</h1>
    <p style="max-width:340px; color:#F5F0E8; opacity:0.85; margin:0;">
      La cuenta <strong>${email || ''}</strong> no tiene acceso a esta app todavía.
      Si creés que es un error, contactá a quien te la compartió.
    </p>
    <button id="muro-logout-btn" style="
      background:transparent; color:#C9A84C; border:1px solid #C9A84C; border-radius:6px;
      padding:0.6rem 1.25rem; font-size:0.9rem; cursor:pointer;
      font-family:'Source Sans 3',sans-serif;
    ">Probar con otra cuenta</button>
  `;
  div.querySelector('#muro-logout-btn').addEventListener('click', () => cerrarSesion());
}

// Oculta la página de entrada (evita el "flash" de contenido sin
// bloquear mientras se resuelve el estado de sesión, que es asíncrono).
_mostrarCargando();

onCambioAuth((user) => {
  if (!user) {
    _mostrarLogin('Iniciá sesión para continuar.');
    return;
  }
  const email = (user.email || '').toLowerCase();
  if (!CORREOS_PERMITIDOS.includes(email)) {
    _mostrarNoAutorizado(user.email);
    return;
  }
  _ocultarMuro();
});
