'use strict';
(function bootstrapJamboree() {
  const loader = document.getElementById('csw-preloader');
  const fill = document.getElementById('loading-progress');
  const copy = document.getElementById('loading-copy');
  const retry = document.getElementById('loading-retry');
  let ready = false;
  let progress = 0;
  let watchdog;
  const fail = () => {
    if (ready) return;
    window.clearTimeout(watchdog);
    copy.textContent = 'The plaza could not open. Check your connection and try again.';
    retry.hidden = false;
    loader.classList.add('has-error');
  };
  retry.addEventListener('click', () => location.reload());
  window.addEventListener('aurelia-load-progress', event => {
    if (ready) return;
    const next = event.detail && event.detail.progress;
    if (typeof next !== 'number' || !Number.isFinite(next)) return;
    progress = Math.max(progress, Math.max(0, Math.min(.99, next)));
    fill.style.transform = `scaleX(${progress})`;
    copy.textContent = `Preparing your treasure adventure · ${Math.round(progress * 100)}%`;
  });
  const revealApp = () => {
    if (ready) return;
    ready = true;
    window.clearTimeout(watchdog);
    fill.style.transform = 'scaleX(1)';
    copy.textContent = 'Let the good times roll!';
    retry.hidden = true;
    // Allow the newly created scene to paint before fading its illustrated cover.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      loader.classList.add('is-ready');
      loader.setAttribute('aria-hidden', 'true');
      const remove = () => loader.remove();
      loader.addEventListener('transitionend', event => {
        if (event.target === loader) remove();
      });
      // Reduced-motion disables transitions, so transitionend is not guaranteed.
      window.setTimeout(remove, 650);
    }));
  };
  window.addEventListener('aurelia-app-ready', revealApp, { once: true });
  window.addEventListener('aurelia-load-error', fail);
  window.addEventListener('error', fail);
  window.addEventListener('unhandledrejection', fail);
  document.addEventListener('visibilitychange', () => {
    document.documentElement.classList.toggle('is-background', document.hidden);
  });
  watchdog = window.setTimeout(fail, 45000);
  if (window.__AURELIA_APP_READY__ === true) revealApp();
  document.getElementById('GameCanvas').addEventListener('contextmenu', event => event.preventDefault());
  try {
    System.import('./index.js').catch(error => {
      console.error('Unable to start Treasure Jamboree.', error);
      fail();
    });
  } catch (error) {
    console.error('Unable to load the Treasure Jamboree engine.', error);
    fail();
  }
}());
