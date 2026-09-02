'use strict';

(function bootstrapImperialTreasureWorld() {
  const loader = document.getElementById('csw-preloader');
  const canvas = document.getElementById('GameCanvas');
  const finishLoading = () => {
    if (!loader || loader.classList.contains('is-ready')) return;
    loader.classList.add('is-ready');
    window.setTimeout(() => loader.parentNode?.removeChild(loader), 650);
  };
  canvas?.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('csw-app-ready', finishLoading, { once: true });
  window.setTimeout(finishLoading, 12_000);
  System.import('./index.js').catch((error) => {
    console.error('Unable to start Imperial Treasure World.', error);
    if (loader) loader.setAttribute('aria-label', 'Unable to load Imperial Treasure World');
  });
}());
