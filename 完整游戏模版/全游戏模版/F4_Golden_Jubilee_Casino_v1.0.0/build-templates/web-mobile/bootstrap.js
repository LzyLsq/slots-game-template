'use strict';

(function bootstrapGoldenJubilee() {
  const loader = document.getElementById('csw-preloader');
  const canvas = document.getElementById('GameCanvas');
  const fill = loader?.querySelector('.csw-loader-track span');
  const percent = loader?.querySelector('.csw-loader-percent');
  const copy = loader?.querySelector('.csw-loader-copy');
  const startedAt = performance.now();
  let ready = false;
  let displayedProgress = 4;
  const paintProgress = (value) => {
    displayedProgress = Math.max(displayedProgress, Math.min(100, Math.round(value)));
    if (fill) fill.style.transform = `scaleX(${displayedProgress / 100})`;
    if (percent) percent.textContent = `${displayedProgress}%`;
    loader?.setAttribute('aria-valuenow', String(displayedProgress));
  };
  const updateProgress = (now) => {
    if (ready || !loader) return;
    paintProgress(Math.min(92, 4 + (now - startedAt) / 34));
    window.requestAnimationFrame(updateProgress);
  };
  const finishLoading = () => {
    if (!loader || ready) return;
    ready = true;
    paintProgress(100);
    if (copy) copy.textContent = 'THE JUBILEE IS READY';
    window.setTimeout(() => loader.classList.add('is-ready'), 160);
    window.setTimeout(() => loader.parentNode?.removeChild(loader), 720);
  };
  paintProgress(displayedProgress);
  window.requestAnimationFrame(updateProgress);
  canvas?.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('csw-app-ready', finishLoading, { once: true });
  window.setTimeout(finishLoading, 12_000);
  System.import('./index.js').catch((error) => {
    console.error('Unable to start Golden Jubilee Casino.', error);
    if (loader) loader.setAttribute('aria-label', 'Unable to load Golden Jubilee Casino');
  });
}());
