/**
 * @file auth-widget.js
 * @description Widget de autenticación reutilizable: botón de estado en
 *   el nav ("Iniciar sesión" / "Hola, {email}") + modal de login/registro
 *   (email+contraseña y Google, con pestañas). Un solo módulo, pensado
 *   para insertarse en cualquier página con 2 líneas:
 *
 *   <div id="auth-widget"></div>
 *   <script type="module">
 *     import { initAuthWidget } from './js/auth-widget.js';
 *     initAuthWidget('auth-widget');
 *   </script>
 *
 * No intenta ser un sistema de rutas protegidas — cada página que
 * necesite saber si hay sesión activa se suscribe con onCambioAuth()
 * directamente (ver historial.html y veredicto-marsella.html).
 *
 * @exports initAuthWidget
 */

import {
  registrarse,
  iniciarSesion,
  iniciarSesionConGoogle,
  cerrarSesion,
  onCambioAuth,
  mensajeError,
} from './auth.js';

function _esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

let _modalInyectado = false;

function _inyectarModal() {
  if (_modalInyectado) return;
  _modalInyectado = true;

  const overlay = document.createElement('div');
  overlay.id = 'auth-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="modal-contenedor" style="max-width: 400px;">
      <button class="modal-btn-cerrar" id="auth-modal-cerrar" aria-label="Cerrar">
        <i class="ph ph-x" aria-hidden="true"></i>
      </button>

      <div class="toggle-modo" style="width: 100%; margin-bottom: var(--space-3);">
        <button class="btn-modo activo" type="button" data-tab="login" style="flex:1;">Iniciar sesión</button>
        <button class="btn-modo" type="button" data-tab="registro" style="flex:1;">Crear cuenta</button>
      </div>

      <p id="auth-modal-error" style="display:none; color:#e07856; font-size:0.85rem; margin-bottom: var(--space-2);"></p>

      <form id="auth-form-email" style="display:flex; flex-direction:column; gap: var(--space-2);">
        <input type="email" id="auth-input-email" placeholder="Email" required
               class="selector-carta" style="width:100%;">
        <input type="password" id="auth-input-password" placeholder="Contraseña (mínimo 6 caracteres)" required minlength="6"
               class="selector-carta" style="width:100%;">
        <button type="submit" class="btn btn--primary" id="auth-btn-submit" style="justify-content:center;">
          Iniciar sesión
        </button>
      </form>

      <div class="cluster" style="gap: var(--space-2); margin: var(--space-3) 0; color: var(--text-muted); font-size: 0.75rem;">
        <hr style="flex:1; border-color: rgba(255,255,255,0.08);">
        o
        <hr style="flex:1; border-color: rgba(255,255,255,0.08);">
      </div>

      <button type="button" class="btn btn--outline" id="auth-btn-google" style="width:100%; justify-content:center;">
        <i class="ph ph-google-logo" aria-hidden="true"></i> Continuar con Google
      </button>
    </div>
  `;
  document.body.appendChild(overlay);

  const inputEmail = overlay.querySelector('#auth-input-email');
  const inputPassword = overlay.querySelector('#auth-input-password');
  const btnSubmit = overlay.querySelector('#auth-btn-submit');
  const errorEl = overlay.querySelector('#auth-modal-error');
  let _tab = 'login';

  function _mostrarError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = msg ? 'block' : 'none';
  }

  overlay.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      _tab = btn.dataset.tab;
      overlay.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('activo', b === btn));
      btnSubmit.textContent = _tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta';
      _mostrarError('');
    });
  });

  overlay.querySelector('#auth-modal-cerrar').addEventListener('click', () => {
    overlay.style.display = 'none';
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.style.display = 'none';
  });

  overlay.querySelector('#auth-form-email').addEventListener('submit', async (e) => {
    e.preventDefault();
    _mostrarError('');
    btnSubmit.disabled = true;
    try {
      if (_tab === 'login') {
        await iniciarSesion(inputEmail.value, inputPassword.value);
      } else {
        await registrarse(inputEmail.value, inputPassword.value);
      }
      overlay.style.display = 'none';
      inputEmail.value = '';
      inputPassword.value = '';
    } catch (err) {
      _mostrarError(mensajeError(err));
    } finally {
      btnSubmit.disabled = false;
    }
  });

  overlay.querySelector('#auth-btn-google').addEventListener('click', async () => {
    _mostrarError('');
    try {
      await iniciarSesionConGoogle();
      overlay.style.display = 'none';
    } catch (err) {
      _mostrarError(mensajeError(err));
    }
  });
}

/**
 * Inicializa el widget dentro del contenedor indicado.
 * @param {string} containerId — id de un elemento vacío en el nav
 */
export function initAuthWidget(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  _inyectarModal();
  const overlay = document.getElementById('auth-modal-overlay');

  // Enlace a "Mi Historial" — visible con y sin sesión (la propia página
  // pide iniciar sesión si hace falta). Vive aquí porque este widget ya se
  // inserta en el nav de las páginas que lo usan.
  const enlaceHistorial = `
        <a href="historial.html" class="nav__link" id="nav-mi-historial">
          <i class="ph ph-stack" aria-hidden="true"></i>&nbsp;Mi Historial
        </a>`;

  onCambioAuth(user => {
    if (user) {
      const nombre = user.displayName || user.email || 'tu cuenta';
      container.innerHTML = `${enlaceHistorial}
        <button class="nav__link" id="auth-btn-cuenta" type="button" style="background:none; border:none; cursor:pointer; font: inherit;">
          <i class="ph ph-check-circle" aria-hidden="true"></i> ${_esc(nombre)}
        </button>
      `;
      container.querySelector('#auth-btn-cuenta').addEventListener('click', async () => {
        if (confirm('¿Cerrar sesión?')) await cerrarSesion();
      });
    } else {
      container.innerHTML = `${enlaceHistorial}
        <button class="nav__link" id="auth-btn-login" type="button" style="background:none; border:none; cursor:pointer; font: inherit;">
          <i class="ph ph-hand-pointing" aria-hidden="true"></i> Iniciar sesión
        </button>
      `;
      container.querySelector('#auth-btn-login').addEventListener('click', () => {
        overlay.style.display = 'flex';
      });
    }
  });
}
