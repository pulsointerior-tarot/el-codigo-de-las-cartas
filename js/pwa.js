/**
 * @file pwa.js
 * @description Registra el service worker (sw.js) para que la web se pueda
 *   instalar como app y abrir sin conexión. Se carga desde todas las páginas.
 *   La ruta de sw.js se calcula a partir de la de este propio archivo, así
 *   funciona igual en la subcarpeta de GitHub Pages que en un dominio propio.
 */
(function () {
  if (!('serviceWorker' in navigator)) return;
  var origen = document.currentScript && document.currentScript.src;
  if (!origen) return;
  var swUrl = new URL('../sw.js', origen).href;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register(swUrl).catch(function (err) {
      console.warn('[pwa.js] No se pudo registrar el service worker:', err);
    });
  });
})();
