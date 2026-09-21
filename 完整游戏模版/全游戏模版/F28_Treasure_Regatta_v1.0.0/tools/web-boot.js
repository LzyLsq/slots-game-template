window.__f28BootReady = function () {
  var splash = document.getElementById('f28Boot');
  if (!splash || splash.classList.contains('is-ready')) return;
  splash.classList.add('is-ready');
  window.setTimeout(function () {
    if (splash.parentNode) splash.parentNode.removeChild(splash);
  }, 620);
};
