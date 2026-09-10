'use strict';
(function bootstrapGoldenHarvest() {
  const loader = document.getElementById('csw-preloader');
  const fill = document.getElementById('loading-progress');
  const copy = document.getElementById('loading-copy');
  const retry = document.getElementById('loading-retry');
  const track = document.getElementById('loading-track');
  let ready = false;
  let watchdog = 0;
  const fail = () => {
    if (ready) return;
    if (watchdog) window.clearTimeout(watchdog);
    copy.textContent = 'Unable to open the lantern district. Check your connection and try again.';
    retry.hidden = false;
    loader.classList.add('has-error');
  };
  retry.addEventListener('click', () => location.reload());
  window.addEventListener('aurelia-load-progress', event => {
    if (ready || loader.classList.contains('has-error')) return;
    const progress = Number(event.detail?.progress);
    if (!Number.isFinite(progress)) return;
    track.classList.remove('is-indeterminate');
    track.setAttribute('aria-valuenow', String(Math.round(Math.max(0, Math.min(1, progress)) * 100)));
    fill.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
    copy.textContent = 'Preparing the harvest district…';
  });
  const revealApp = () => {
    if (ready) return;
    ready = true;
    if (watchdog) window.clearTimeout(watchdog);
    loader.classList.remove('has-error');
    retry.hidden = true;
    track.classList.remove('is-indeterminate');
    track.setAttribute('aria-valuenow', '100');
    fill.style.transform = 'scaleX(1)';
    copy.textContent = 'Welcome to the harvest district';
    // Two frames allow the ready canvas to paint before the cover dissolves.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      loader.classList.add('is-ready');
      loader.setAttribute('aria-hidden', 'true');
      loader.addEventListener('transitionend', event => { if (event.target === loader) loader.remove(); });
      window.setTimeout(() => loader.remove(), 900);
    }));
  };
  window.addEventListener('aurelia-app-ready', revealApp, { once: true });
  // Accept the pre-Aurelia event during incremental installs so an older
  // cached application bundle can never strand players behind the loader.
  window.addEventListener('csw-app-ready', revealApp, { once: true });
  window.addEventListener('aurelia-load-error', fail);
  window.addEventListener('error', fail);
  if (window.__AURELIA_APP_READY__ === true) revealApp();
  if (!ready) watchdog = window.setTimeout(fail, 45000);
  document.getElementById('GameCanvas').addEventListener('contextmenu', event => event.preventDefault());
  System.import('./index.js').catch(error => { console.error('Unable to start Golden Harvest Lantern District.', error); fail(); });
}());
