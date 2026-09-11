'use strict';
(function bootstrapAurelia() {
  const loader = document.getElementById('csw-preloader');
  const fill = document.getElementById('loading-progress');
  const copy = document.getElementById('loading-copy');
  const vault = document.querySelector('.treasure-loading');
  const retry = document.getElementById('loading-retry');
  let ready = false;
  let watchdog = 0;
  const fail = () => {
    if (ready) return;
    if (watchdog) window.clearTimeout(watchdog);
    copy.textContent = 'Unable to open the treasury. Check your connection and try again.';
    retry.hidden = false;
    loader.classList.add('has-error');
  };
  retry.addEventListener('click', () => location.reload());
  window.addEventListener('aurelia-load-progress', event => {
    fill.style.transform = `scaleX(${Math.max(0, Math.min(1, event.detail.progress))})`;
    const progress = Math.max(0, Math.min(1, event.detail.progress));
    vault.style.setProperty('--progress',String(progress));
    copy.textContent = `Opening treasury · ${Math.round(progress * 100)}%`;
  });
  const revealApp = () => {
    if (ready) return;
    ready = true;
    if (watchdog) window.clearTimeout(watchdog);
    fill.style.transform = 'scaleX(1)';
    copy.textContent = 'Welcome inside · 100%';
    vault.classList.add('unlocked');
    window.setTimeout(() => loader.classList.add('is-ready'), 450);
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
  watchdog = window.setTimeout(fail, 45000);
  document.getElementById('GameCanvas').addEventListener('contextmenu', event => event.preventDefault());
  System.import('./index.js').catch(error => { console.error('Unable to start Golden Canopy.', error); fail(); });
}());
