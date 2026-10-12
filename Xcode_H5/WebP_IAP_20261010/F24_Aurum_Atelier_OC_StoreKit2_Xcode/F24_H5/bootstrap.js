'use strict';
(function bootstrapAurelia() {
  const loader = document.getElementById('csw-preloader');
  const fill = document.getElementById('loading-progress');
  const copy = document.getElementById('loading-copy');
  const vault = document.querySelector('.treasure-loading');
  const retry = document.getElementById('loading-retry');

  let locale='en';try{locale=localStorage.getItem('aurum-atelier-f24.locale.v1')||'en';}catch{}
  const lang=/^zh/i.test(locale)?(/TW|HK|Hant/i.test(locale)?2:1):/^ja/i.test(locale)?3:/^ko/i.test(locale)?4:0;
  const words=[
    ["CRAFTED IN GOLD", "Preparing your atelier…", "Try again", "Virtual coins · No cash value or cash-out", "Unable to open the atelier. Check your connection and try again.", "Preparing your atelier", "Welcome inside"],
    ["鎏金匠艺，静候开启", "正在准备工坊…", "重试", "虚拟金币 · 无现金价值，不可提现", "无法开启工坊，请检查网络后重试。", "正在准备工坊", "欢迎进入"],
    ["鎏金匠藝，靜候開啟", "正在準備工坊…", "重試", "虛擬金幣 · 無現金價值，不可提現", "無法開啟工坊，請檢查網路後重試。", "正在準備工坊", "歡迎進入"],
    ["黄金の工房へようこそ", "アトリエを準備しています…", "再試行", "仮想コイン · 金銭的価値なし・換金不可", "アトリエを開けません。接続を確認して再試行してください。", "アトリエを準備中", "ようこそ"],
    ["황금빛 공방에 오신 것을 환영합니다", "아틀리에를 준비하는 중…", "다시 시도", "가상 코인 · 현금 가치 없음 · 현금화 불가", "아틀리에를 열 수 없습니다. 연결을 확인하고 다시 시도하세요.", "아틀리에 준비 중", "환영합니다"]
  ][lang];
  document.documentElement.lang=['en','zh-CN','zh-TW','ja','ko'][lang];
  document.querySelector('.invitation').textContent=words[0];
  document.querySelector('.virtual-notice').textContent=words[3];
  copy.textContent=words[1];retry.textContent=words[2];
  loader.setAttribute('aria-label', words[1]);
  const track = document.querySelector('.loading-track');
  track.setAttribute('aria-label', words[5]);
  let progress = 0;
  let ready = false;
  let watchdog = 0;
  const fail = () => {
    if (ready) return;
    if (watchdog) window.clearTimeout(watchdog);
    copy.textContent = words[4];
    retry.hidden = false;
    loader.classList.add('has-error');
  };
  retry.addEventListener('click', () => location.reload());
  window.addEventListener('aurelia-load-progress', event => {
    if (ready || loader.classList.contains('has-error')) return;
    const value = Number(event.detail?.progress);
    if (!Number.isFinite(value)) return;
    progress = Math.max(progress, Math.max(0, Math.min(1, value)));
    fill.style.transform = `scaleX(${progress})`;
    track.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    copy.textContent = `${words[5]} · ${Math.round(progress * 100)}%`;
  });
  const revealApp = () => {
    if (ready) return;
    ready = true;
    if (watchdog) window.clearTimeout(watchdog);
    fill.style.transform = 'scaleX(1)';
    track.setAttribute('aria-valuenow', '100');
    retry.hidden = true;
    loader.classList.remove('has-error');
    copy.textContent = words[6]+' · 100%';
    vault.classList.add('unlocked');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const removeLoader = () => loader.remove();
    loader.addEventListener('transitionend', event => {
      if (event.target === loader && event.propertyName === 'opacity') removeLoader();
    });
    window.setTimeout(() => {
      // Allow the canvas to present its first completed frame before fading.
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        loader.classList.add('is-ready');
        loader.setAttribute('aria-hidden', 'true');
        // Reduced motion has no transitionend; cover interrupted transitions too.
        window.setTimeout(removeLoader, reduced ? 0 : 300);
      }));
    }, 0);
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
  System.import('./index.js').catch(error => { console.error('Unable to start Aurum Atelier.', error); fail(); });
}());
