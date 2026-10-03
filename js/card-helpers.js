/**
 * @file card-helpers.js
 * @description Helpers de render de UI para tarjetas de carta. Reemplaza a
 *   cards.js, que no existe en la arquitectura dual actual (era de la app
 *   anterior, mono-tradición — ver Sección 3.3 del Documento Maestro).
 *   No hace fetch() ni duplica getCartaById()/buscarCombinacion() — Regla
 *   10.1: los objetos carta siempre llegan ya cargados desde
 *   data-marsella.js / data-rws.js por quien llama a estas funciones.
 *
 * @exports getNombreCompleto, renderPlaceholderCarta
 */

import { getUrlImagen } from './images.js';

/**
 * Nombre completo de una carta para mostrar en UI, ej. "1 — El Loco".
 * Soporta ambos esquemas de numeración: numero_original (Marsella,
 * Sección 8.2) y numero_rds (RWS, Sección 8.1).
 *
 * @param {object} carta
 * @returns {string}
 */
export function getNombreCompleto(carta) {
  if (!carta) return '';
  const numero = carta.numero_original ?? carta.numero_rds ?? '';
  const nombre = carta.arcano_es ?? '';
  return numero !== '' ? `${numero} — ${nombre}` : nombre;
}

/**
 * Renderiza una carta: imagen real desde tarot-imagenes (Regla 10.1: pasa
 * por getUrlImagen(), nunca URL hardcodeada) cuando la carta tiene slug
 * conocido; si no hay slug, o si la imagen falla al cargar, cae al
 * placeholder CSS (Sección 6.3 del Documento Maestro).
 *
 * ⚠️ CORRECCIÓN 16/8/2026: esta función mostraba SIEMPRE el placeholder,
 * incluso con una carta ya identificada (ej. modo automático de
 * indicar-cartas.html, donde la carta revelada es conocida) — nunca
 * intentaba la imagen real. Confirmado visualmente por el usuario:
 * las cartas reveladas en modo automático mostraban el ícono genérico
 * en vez de la carta real.
 *
 * @param {object} carta
 * @param {string} mazoId — 'marst1' | 'mars2' | 'rwst1' | 'rws2'
 * @param {'full'|'medium'|'thumb'|'icon'} [tamano='medium']
 * @param {'recta'|'invertida'} [orientacion='recta']
 * @returns {string} HTML
 */
export function renderPlaceholderCarta(carta, mazoId, tamano = 'medium', orientacion = 'recta') {
  const nombre = getNombreCompleto(carta);
  const claseInvertida = orientacion === 'invertida' ? ' invertida' : '';

  if (carta && carta.slug && mazoId) {
    const url = getUrlImagen(carta, mazoId, tamano);
    if (url) {
      // data-slug/data-mazo: permiten al lightbox global (main.js) pedir la
      // versión "full" de esta misma carta al hacer click, sin importar en
      // qué tamaño se está mostrando acá (thumb/medium/icon).
      return `<img src="${url}" alt="${nombre}" title="${nombre}" loading="lazy"
        class="placeholder-carta-${tamano}${claseInvertida} carta-ampliable"
        data-slug="${carta.slug}" data-mazo="${mazoId}" data-nombre="${nombre}"
        onerror="this.classList.add('img-error'); this.removeAttribute('src');">`;
    }
  }

  return `<div class="placeholder-carta-${tamano} placeholder-carta ${mazoId}${claseInvertida}" title="${nombre}">
    <i class="ph ph-cards" aria-hidden="true"></i>
  </div>`;
}
