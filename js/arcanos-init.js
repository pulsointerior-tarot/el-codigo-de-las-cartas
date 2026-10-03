/**
 * @file arcanos-init.js
 * @description Punto de entrada de arcanos.html. Reemplaza la versión v26
 *   (que importaba de data.js/cards.js — ambos eliminados en el refactor
 *   dual, ver Sección 3.3). A diferencia de la v26, este módulo asume más
 *   responsabilidad propia: no existe ningún cards.js/modal.js en la
 *   arquitectura actual, así que la galería, el modal y su navegación
 *   prev/next viven aquí directamente.
 *
 * Responsabilidad:
 *   · Selector de tradición (Marsella / RWS) si se entra sin consulta activa
 *   · Cargar las 78 cartas de la tradición activa vía data-marsella.js o
 *     data-rws.js (Sección 10.1 — nunca fetch directo)
 *   · Renderizar galería por secciones: Mayores + 4 palos, agrupando por
 *     RANGO DE ID (no por el campo "palo"/"palo_rds" — esos campos traen
 *     texto descriptivo, no un valor corto fiable para filtrar; los rangos
 *     de abajo son los mismos ya verificados en data-marsella.js/data-rws.js
 *     para el chunking de combinaciones)
 *   · Selector de mazo, acotado a los 2 mazos reales de la tradición activa
 *     (marst1/mars2 para Marsella, rwst1/rws2 para RWS — Sección 4.6)
 *   · Buscador en tiempo real
 *   · Modal de detalle vía renderSeccionesCarta() (Sección 7.6), con toggle
 *     Recta/Invertida y navegación prev/next
 *
 * @estado_de_verificacion (actualizado tras corregir navigation.js — ya no
 *   son problemas abiertos, se resolvieron en la misma sesión):
 *   - getTradicion()/getMazo()/setMazo(): ya corregidos en navigation.js
 *     (Opción A confirmada por el usuario: la tradición se DERIVA del mazo
 *     guardado, mars*→marsella, rws*→rws — una sola fuente de verdad, sin
 *     clave separada que se pueda desincronizar). Este archivo ahora
 *     importa y usa esas funciones reales, no un parche local.
 *   - Modal: reescrito para usar las clases reales de components.css
 *     (.modal-overlay/.modal-contenedor/.modal-btn-cerrar/.modal-navegacion/
 *     .modal-identificacion/.modal-imagen-container/.modal-carta-full/
 *     .modal-numero/.modal-titulo) y el toggle real (.toggle-orientacion/
 *     .btn-orientacion[data-orientacion]/.activo).
 *   - carta.tipo === 'arcano_mayor': SIGUE sin verificar contra un JSON de
 *     cartas real. Si el valor real es distinto, la sección "Arcanos
 *     Mayores" queda vacía sin ningún error visible. Pendiente.
 *   - Placeholder de imagen rota y miniatura de galería: NO existe CSS para
 *     ninguna de las dos en components.css. Clases marcadas "-pendiente"
 *     en este archivo — pendiente que se agregue el CSS real.
 */

import { getCartas as getCartasMarsella, getCartaById as getCartaByIdMarsella } from './data-marsella.js';
import { getCartas as getCartasRws, getCartaById as getCartaByIdRws } from './data-rws.js';
import { renderSeccionesCarta as renderSeccionesMarsella } from './render-carta-marsella.js';
import { renderSeccionesCarta as renderSeccionesRws } from './render-carta-rws.js';
import { getUrlImagen } from './images.js';
import { getUrlParam, navigateTo, getTradicion, getMazo, setMazo } from './navigation.js';
import { GLOSARIO_MARSELLA, GLOSARIO_RWS } from './glosario-arcanos.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG POR TRADICIÓN
// ─────────────────────────────────────────────────────────────────────────────

// Mismos rangos de id que data-marsella.js/data-rws.js (PALO_RANGOS) — única
// fuente fiable para agrupar por palo, ver nota de @supuestos arriba.
const RANGOS_PALO = [
  { min: 23, max: 36 },
  { min: 37, max: 50 },
  { min: 51, max: 64 },
  { min: 65, max: 78 },
];

const CONFIG_TRADICION = {
  marsella: {
    getCartas:     getCartasMarsella,
    getCartaById:  getCartaByIdMarsella,
    renderFicha:   renderSeccionesMarsella,
    mazos:         ['marst1', 'mars2'],
    mazoLabels:    { marst1: 'Mazo Clásico', mars2: 'Mazo Ilustrado IA' },
    secciones: [
      { id: 'mayores', titulo: 'Arcanos Mayores', subtitulo: 'Los 22 arcanos que representan arquetipos universales', rango: null },
      { id: 'batons',  titulo: 'Bastos',   subtitulo: 'Fuego · Acción, voluntad e iniciativa',       rango: RANGOS_PALO[0] },
      { id: 'coupes',  titulo: 'Copas',    subtitulo: 'Agua · Emoción, intuición y vínculos',         rango: RANGOS_PALO[1] },
      { id: 'epees',   titulo: 'Espadas',  subtitulo: 'Aire · Verdad, conflicto y discernimiento',    rango: RANGOS_PALO[2] },
      { id: 'deniers', titulo: 'Oros',     subtitulo: 'Tierra · Materia, trabajo y seguridad',        rango: RANGOS_PALO[3] },
    ],
  },
  rws: {
    getCartas:     getCartasRws,
    getCartaById:  getCartaByIdRws,
    renderFicha:   renderSeccionesRws,
    mazos:         ['rwst1', 'rws2'],
    mazoLabels:    { rwst1: 'Mazo Clásico', rws2: 'Mazo Ilustrado IA' },
    secciones: [
      { id: 'mayores',   titulo: 'Arcanos Mayores', subtitulo: 'Los 22 arcanos que representan arquetipos universales', rango: null },
      { id: 'wands',     titulo: 'Bastos',    subtitulo: 'Fuego · Acción, voluntad e iniciativa',    rango: RANGOS_PALO[0] },
      { id: 'cups',      titulo: 'Copas',     subtitulo: 'Agua · Emoción, intuición y vínculos',      rango: RANGOS_PALO[1] },
      { id: 'swords',    titulo: 'Espadas',   subtitulo: 'Aire · Verdad, conflicto y discernimiento', rango: RANGOS_PALO[2] },
      { id: 'pentacles', titulo: 'Oros',      subtitulo: 'Tierra · Materia, trabajo y seguridad',     rango: RANGOS_PALO[3] },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO
// ─────────────────────────────────────────────────────────────────────────────

let _tradicion = null;           // 'marsella' | 'rws' — null hasta elegir
let _todasLasCartas = [];
let _mazo = null;
let _terminoBusqueda = '';
let _modalIndiceActual = -1;     // índice dentro de _cartasVisiblesModal para prev/next
let _cartasVisiblesModal = [];
let _orientacionModal = 'recta';

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZAR — para búsqueda sin acentos
// ─────────────────────────────────────────────────────────────────────────────

function _normalizar(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function _cartaMatchBusqueda(carta) {
  if (!_terminoBusqueda) return true;
  const t = _terminoBusqueda;
  return _normalizar(carta.arcano_es).includes(t)
    || _normalizar(String(carta.numero_original ?? carta.numero_rds ?? '')).includes(t)
    || _normalizar(carta.palabras_clave_recta || carta.palabras_clave || '').includes(t);
}

function _cartaEnRango(carta, rango) {
  if (!rango) {
    // ⚠️ PARCHE 13/8/2026: carta.tipo === 'arcano_mayor' nunca matcheaba —
    // el campo real es texto largo y distinto por tradición: Marsella
    // "Arcano mayor: fuerza universal..." / RWS "MAYOR: Fuerza
    // arquetípica...". Verificado contra ambos JSON reales. Con la
    // comparación estricta original, la sección "Arcanos Mayores" quedaba
    // siempre vacía en las dos tradiciones — confirma el riesgo que ya
    // señalaba el comentario original de este archivo (@estado_de_verificacion).
    const tipo = String(carta.tipo || '').toLowerCase();
    return tipo.startsWith('arcano mayor') || tipo.startsWith('mayor');
  }
  return carta.id >= rango.min && carta.id <= rango.max;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGEN CON FALLBACK
// ─────────────────────────────────────────────────────────────────────────────

function _imgTag(carta, tamano, claseExtra = '') {
  const url = getUrlImagen(carta, _mazo, tamano);
  // AVISO: no existe clase de placeholder en components.css todavía.
  // "img-placeholder-pendiente" es un nombre provisional sin estilos reales
  // — solo evita romper el layout con un <img> sin src. Falta CSS real.
  if (!url) {
    return `<div class="img-placeholder-pendiente ${claseExtra}" aria-hidden="true"></div>`;
  }
  return `<img src="${url}" alt="${_esc(carta.arcano_es)}" class="${claseExtra}" loading="lazy"
            onerror="this.replaceWith(Object.assign(document.createElement('div'), {className:'img-placeholder-pendiente ${claseExtra}'}))">`;
}

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER — SELECTOR DE TRADICIÓN
// ─────────────────────────────────────────────────────────────────────────────

function _renderSelectorTradicion() {
  const cont = document.getElementById('grid-arcanos');
  if (!cont) return;
  cont.innerHTML = `
    <div class="center-content" style="padding:var(--space-6); width:100%; gap:var(--space-3); flex-direction:column;">
      <p class="text-muted">Elige una tradición para ver la galería de arcanos</p>
      <div class="cluster" style="gap:var(--space-2);">
        <button class="btn btn-primary" id="btn-trad-marsella">MARSELLA</button>
        <button class="btn btn-primary" id="btn-trad-rws">RIDER-WAITE</button>
      </div>
    </div>`;
  document.getElementById('btn-trad-marsella')?.addEventListener('click', () => _elegirTradicion('marsella'));
  document.getElementById('btn-trad-rws')?.addEventListener('click', () => _elegirTradicion('rws'));
}

async function _elegirTradicion(trad) {
  // ⚠️ CORRECCIÓN 16/8/2026: este setMazo() pisaba silenciosamente el
  // mazo/tradición real guardado por una consulta activa. Este selector
  // solo se muestra en el flujo de exploración libre desde Estudios (ver
  // fix en init(), más arriba) — explorar acá NO debe alterar el estado
  // de Consultas. _mazo/_tradicion quedan como variables locales del
  // módulo, ya son lo único que usa el resto de este archivo para
  // renderizar (getUrlImagen(carta, _mazo, tamano), línea ~144).
  _tradicion = trad;
  _mazo = CONFIG_TRADICION[trad].mazos[0];
  await _cargarYRenderizar();
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER — GALERÍA POR SECCIONES
// ─────────────────────────────────────────────────────────────────────────────

function _renderGaleria() {
  const grid = document.getElementById('grid-arcanos');
  if (!grid) return;
  const cfg = CONFIG_TRADICION[_tradicion];

  let html = '';
  let totalVisibles = 0;
  _cartasVisiblesModal = [];

  for (const seccion of cfg.secciones) {
    const cartas = _todasLasCartas
      .filter(c => _cartaEnRango(c, seccion.rango))
      .filter(_cartaMatchBusqueda);

    if (cartas.length === 0) continue;

    totalVisibles += cartas.length;
    _cartasVisiblesModal.push(...cartas);

    html += `
      <section class="arcanos-seccion" id="sec-${seccion.id}" aria-label="${seccion.titulo}">
        <div class="arcanos-seccion-header">
          <h2 class="arcanos-seccion-titulo">${seccion.titulo}</h2>
          <p class="arcanos-seccion-subtitulo text-muted">${seccion.subtitulo}</p>
        </div>
        <div class="arcanos-grid">
          ${cartas.map(carta => `
            <div class="carta-thumbnail-pendiente" data-id="${carta.id}" tabindex="0" role="button"
                 aria-label="Ver ${_esc(carta.arcano_es)}">
              ${_imgTag(carta, 'thumb', 'carta-thumbnail-pendiente-img')}
              <span class="carta-thumbnail-pendiente-label">${_esc(carta.arcano_es)}</span>
            </div>`).join('')}
        </div>
      </section>`;
  }

  if (totalVisibles === 0) {
    html = `
      <div class="center-content" style="padding:var(--space-6); width:100%;">
        <i class="ph ph-magnifying-glass" style="font-size:2.5rem; opacity:0.3;" aria-hidden="true"></i>
        <p class="text-muted" style="margin-top:var(--space-2);">No se encontraron cartas para "<strong>${_esc(_terminoBusqueda)}</strong>"</p>
      </div>`;
  }

  grid.innerHTML = html;

  const contador = document.getElementById('buscador-contador');
  if (contador) {
    contador.textContent = _terminoBusqueda
      ? `${totalVisibles} carta${totalVisibles !== 1 ? 's' : ''} encontrada${totalVisibles !== 1 ? 's' : ''}`
      : '';
  }

  grid.querySelectorAll('.carta-thumbnail-pendiente').forEach(wrapper => {
    const handler = () => {
      const id = parseInt(wrapper.dataset.id, 10);
      const idx = _cartasVisiblesModal.findIndex(c => c.id === id);
      if (idx !== -1) _abrirModal(idx);
    };
    wrapper.addEventListener('click', handler);
    wrapper.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER — GLOSARIO DE CAMPOS (al final de la página, según tradición activa)
// ─────────────────────────────────────────────────────────────────────────────

function _renderGlosario() {
  const seccion = document.getElementById('seccion-glosario');
  const cont = document.getElementById('glosario-arcanos');
  if (!seccion || !cont) return;

  const glosario = _tradicion === 'marsella' ? GLOSARIO_MARSELLA : GLOSARIO_RWS;

  cont.innerHTML = glosario.map(bloque => `
    <section class="mt-4">
      <h3 style="margin-bottom:var(--space-2); font-family:'Cinzel',serif; font-size:0.85rem;
                 font-weight:700; letter-spacing:0.1em; text-transform:uppercase;
                 color:var(--secondary); padding-bottom:var(--space-1);
                 border-bottom:1px solid rgba(201,168,76,0.15);">${_esc(bloque.seccion)}</h3>
      <div class="datos-grid">
        ${bloque.campos.map(c => `
          <div class="dato-item">
            <span class="dato-label">${_esc(c.etiqueta)}</span>
            <span class="dato-valor">${_esc(c.texto)}</span>
          </div>`).join('')}
      </div>
    </section>`).join('');

  seccion.style.display = '';
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER — CONTROLES (tradición activa + buscador + mazo + volver)
// ─────────────────────────────────────────────────────────────────────────────

function _renderControles() {
  const cont = document.getElementById('controles-arcanos');
  if (!cont) return;
  const cfg = CONFIG_TRADICION[_tradicion];
  const desde = getUrlParam('desde');

  cont.innerHTML = `
    <div class="arcanos-controles-wrapper">
      <button type="button" class="badge-tipo badge-tipo--clickeable" id="btn-cambiar-tradicion"
              title="Cambiar a ${_tradicion === 'marsella' ? 'Rider-Waite-Smith' : 'Marsella'}">
        ${_tradicion === 'marsella' ? 'MARSELLA' : 'RIDER-WAITE'}
        <i class="ph ph-arrows-clockwise" aria-hidden="true"></i>
      </button>
      <div class="buscador-arcanos-wrapper">
        <i class="ph ph-magnifying-glass buscador-icono" aria-hidden="true"></i>
        <input type="text" id="buscador-arcanos" class="buscador-input"
               placeholder="Buscar carta por nombre, número o palabra clave..."
               autocomplete="off" aria-label="Buscar carta" />
        <button id="buscador-arcanos-limpiar" class="buscador-btn-limpiar" type="button"
                aria-label="Limpiar búsqueda" style="display:none;">
          <i class="ph ph-x" aria-hidden="true"></i>
        </button>
      </div>
      <span id="buscador-contador" class="text-muted" style="font-size:0.85rem;"></span>
      <select class="select-mazo" id="selector-mazo" aria-label="Seleccionar mazo">
        ${cfg.mazos.map(m => `<option value="${m}"${_mazo === m ? ' selected' : ''}>${cfg.mazoLabels[m]}</option>`).join('')}
      </select>
      ${desde === 'resultado' ? `
        <button class="btn btn-secondary btn-sm" id="btn-volver-resultado">
          <i class="ph ph-arrow-left" aria-hidden="true"></i> Volver al resultado
        </button>` : ''}
      <a href="index.html" class="btn btn-secondary btn-sm">
        <i class="ph ph-house" aria-hidden="true"></i> Inicio
      </a>
    </div>`;

  const input   = document.getElementById('buscador-arcanos');
  const limpiar = document.getElementById('buscador-arcanos-limpiar');

  input?.addEventListener('input', () => {
    _terminoBusqueda = _normalizar(input.value.trim());
    limpiar.style.display = input.value ? 'flex' : 'none';
    _renderGaleria();
  });

  limpiar?.addEventListener('click', () => {
    input.value = '';
    _terminoBusqueda = '';
    limpiar.style.display = 'none';
    _renderGaleria();
    input.focus();
  });

  document.getElementById('selector-mazo')?.addEventListener('change', e => {
    _mazo = e.target.value;
    setMazo(_mazo);
    _renderGaleria();
  });

  // AÑADIDO 18/9/2026, a pedido de la usuaria: antes el rótulo
  // RIDER-WAITE/MARSELLA era un <span> fijo — no había forma de cambiar
  // de tradición sin volver a Inicio. Reutiliza _elegirTradicion(), la
  // misma función que ya usa el selector de tradición inicial.
  document.getElementById('btn-cambiar-tradicion')?.addEventListener('click', () => {
    _elegirTradicion(_tradicion === 'marsella' ? 'rws' : 'marsella');
  });

  document.getElementById('btn-volver-resultado')?.addEventListener('click', () => {
    // Nombre de archivo real según tradición — resultado.html ya no existe.
    navigateTo(_tradicion === 'marsella' ? 'veredicto-marsella.html' : 'veredicto-rws.html');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DE DETALLE — toggle recta/invertida + prev/next
// ─────────────────────────────────────────────────────────────────────────────

// #modal-arcano es un <div> contenedor vacío que debe existir en arcanos.html.
// .modal-overlay ya trae position:fixed a pantalla completa (ver
// components.css) — no hace falta ninguna clase "is-open": simplemente se
// inyecta o se vacía el HTML del contenedor.
function _abrirModal(indice) {
  _modalIndiceActual = indice;
  _orientacionModal = 'recta';
  _renderModal();
}

function _cerrarModal() {
  const modal = document.getElementById('modal-arcano');
  if (modal) modal.innerHTML = '';
}

function _renderModal() {
  const modal = document.getElementById('modal-arcano');
  if (!modal) return;
  const carta = _cartasVisiblesModal[_modalIndiceActual];
  if (!carta) return;
  const cfg = CONFIG_TRADICION[_tradicion];
  const numero = carta.numero_original ?? carta.numero_rds ?? '';

  // Estructura y clases reales de components.css — NO usar nombres inventados.
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-contenedor">
        <button class="modal-btn-cerrar" id="modal-cerrar-btn" aria-label="Cerrar">
          <i class="ph ph-x" aria-hidden="true"></i>
        </button>

        <div class="modal-identificacion">
          <div class="modal-imagen-container">
            ${_imgTag(carta, 'full', 'modal-carta-full')}
          </div>
          <div class="modal-identificacion-info">
            ${numero !== '' ? `<div class="modal-numero">${_esc(numero)}</div>` : ''}
            <div class="modal-titulo">${_esc(carta.arcano_es)}</div>
            <div class="modal-toggle-wrapper">
              <div class="toggle-orientacion">
                <button class="btn-orientacion${_orientacionModal === 'recta' ? ' activo' : ''}"
                        data-orientacion="recta" id="modal-btn-recta">
                  <span class="toggle-label">Recta</span>
                </button>
                <button class="btn-orientacion${_orientacionModal === 'invertida' ? ' activo' : ''}"
                        data-orientacion="invertida" id="modal-btn-invertida">
                  <span class="toggle-label">Invertida</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        ${cfg.renderFicha(carta, _orientacionModal)}

        <div class="modal-navegacion">
          <button class="btn btn-secondary btn-sm" id="modal-prev" ${_modalIndiceActual <= 0 ? 'disabled' : ''}>
            <i class="ph ph-arrow-left" aria-hidden="true"></i> Anterior
          </button>
          <button class="btn btn-secondary btn-sm" id="modal-next" ${_modalIndiceActual >= _cartasVisiblesModal.length - 1 ? 'disabled' : ''}>
            Siguiente <i class="ph ph-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>`;

  document.getElementById('modal-cerrar-btn')?.addEventListener('click', _cerrarModal);
  document.getElementById('modal-btn-recta')?.addEventListener('click', () => {
    if (_orientacionModal !== 'recta') { _orientacionModal = 'recta'; _renderModal(); }
  });
  document.getElementById('modal-btn-invertida')?.addEventListener('click', () => {
    if (_orientacionModal !== 'invertida') { _orientacionModal = 'invertida'; _renderModal(); }
  });
  document.getElementById('modal-prev')?.addEventListener('click', () => {
    if (_modalIndiceActual > 0) _abrirModal(_modalIndiceActual - 1);
  });
  document.getElementById('modal-next')?.addEventListener('click', () => {
    if (_modalIndiceActual < _cartasVisiblesModal.length - 1) _abrirModal(_modalIndiceActual + 1);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CARGA + INIT
// ─────────────────────────────────────────────────────────────────────────────

async function _cargarYRenderizar() {
  const grid = document.getElementById('grid-arcanos');
  if (grid) {
    grid.innerHTML = `
      <div class="center-content" style="padding:var(--space-6); width:100%;">
        <i class="ph ph-spinner" style="font-size:2rem; color:var(--secondary); animation:spin 1s linear infinite;" aria-hidden="true"></i>
        <p class="text-muted" style="margin-top:var(--space-2);">Cargando arcanos…</p>
      </div>`;
  }

  try {
    _todasLasCartas = await CONFIG_TRADICION[_tradicion].getCartas();
  } catch (err) {
    console.error('[arcanos-init.js] Error cargando cartas:', err);
    if (grid) grid.innerHTML = `<p class="text-muted" style="text-align:center; padding:var(--space-4);">Error al cargar las cartas.</p>`;
    return;
  }

  _renderControles();
  _renderGaleria();
  _renderGlosario();

  // Deep-link a una carta específica: ?carta=<slug> — agregado 16/8/2026
  // para conectar el Bloque 1 de resultado-marsella/rws.html con la ficha
  // completa de arcanos.html (las 10 áreas de consulta que resultado NO
  // muestra — ver nota de arquitectura en resultado-marsella.js). Sin
  // esto, no había forma de llegar de una carta del resultado a su ficha
  // completa.
  const slugParam = getUrlParam('carta');
  if (slugParam) {
    const idx = _cartasVisiblesModal.findIndex(c => c.slug === slugParam);
    if (idx !== -1) _abrirModal(idx);
  }
}

async function init() {
  clearTimeout(window.__arcanos_init_watchdog);

  // ⚠️ CORRECCIÓN 16/8/2026: la condición original saltaba el selector de
  // tradición con solo comprobar que hubiera un mazo guardado en
  // localStorage — pero mazo_seleccionado/tradicion NO expiran nunca
  // (a diferencia de tirada_actual, que sí tiene 24h — Sección 4.2). Una
  // vez hecha una sola consulta, el selector quedaba muerto para siempre,
  // aunque el usuario entrara a arcanos.html desde Estudios sin ninguna
  // consulta activa. La señal real de "vengo de una consulta activa" es
  // el parámetro ?desde=resultado (Sección 4.4) — ya se usaba para el
  // botón "Volver al resultado" en _renderControles(), pero no acá.
  const mazoGuardado = getMazo();
  const tradicionActiva = getTradicion();
  const vieneDeConsulta = getUrlParam('desde') === 'resultado';
  if (vieneDeConsulta && mazoGuardado && tradicionActiva && CONFIG_TRADICION[tradicionActiva]) {
    _tradicion = tradicionActiva;
    _mazo = mazoGuardado;
    await _cargarYRenderizar();
  } else {
    _renderSelectorTradicion();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
