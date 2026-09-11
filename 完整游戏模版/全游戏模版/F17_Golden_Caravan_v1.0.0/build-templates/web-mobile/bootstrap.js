'use strict';
(function bootstrapAurelia() {
  const loader = document.getElementById('csw-preloader');
  const fill = document.getElementById('loading-progress');
  const copy = document.getElementById('loading-copy');
  const retry = document.getElementById('loading-retry');
  let ready = false;
  let watchdog = 0;
  const fail = () => {
    if (ready) return;
    if (watchdog) window.clearTimeout(watchdog);
    copy.textContent = 'Unable to open the exhibition. Check your connection and try again.';
    retry.hidden = false;
    loader.classList.add('has-error');
  };
  retry.addEventListener('click', () => location.reload());
  window.addEventListener('aurelia-load-progress', event => {
    fill.style.transform = `scaleX(${Math.max(0, Math.min(1, event.detail.progress))})`;
    copy.textContent = 'Preparing your golden celebration…';
  });
  const revealApp = () => {
    if (ready) return;
    ready = true;
    if (watchdog) window.clearTimeout(watchdog);
    fill.style.transform = 'scaleX(1)';
    loader.classList.add('is-ready');
    loader.setAttribute('aria-hidden', 'true');
    loader.addEventListener('transitionend', () => loader.remove(), { once: true });
  };
  window.addEventListener('aurelia-app-ready', revealApp, { once: true });
  // Accept the pre-Aurelia event during incremental installs so an older
  // cached application bundle can never strand players behind the loader.
  window.addEventListener('csw-app-ready', revealApp, { once: true });
  window.addEventListener('aurelia-load-error', fail);
  window.addEventListener('error', fail);
  if (window.__AURELIA_APP_READY__ === true) revealApp();
  watchdog = window.setTimeout(fail, 20000);
  document.getElementById('GameCanvas').addEventListener('contextmenu', event => event.preventDefault());
  System.import('./index.js').catch(error => { console.error('Unable to start Golden Caravan.', error); fail(); });
}());
