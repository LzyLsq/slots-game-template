'use strict';
(function bootstrapAurumExpress() {
  const loader = document.getElementById('csw-preloader');
  const fill = document.getElementById('loading-progress');
  const copy = document.getElementById('loading-copy');
  const vault = document.querySelector('.treasure-loading');
  const track = document.querySelector('.loading-track');
  const coin = document.querySelector('.loading-coin');
  const retry = document.getElementById('loading-retry');

  let locale='en';try{locale=localStorage.getItem('aurum-express-f32.locale.v1')||'en';}catch{}
  const lang=/^zh/i.test(locale)?(/TW|HK|Hant/i.test(locale)?2:1):/^ja/i.test(locale)?3:/^ko/i.test(locale)?4:0;
  const words=[["THE GOLDEN TRAIN IS ARRIVING", "Preparing the golden departure…", "Try again", "Virtual coins · No cash value or cash-out", "Unable to open Aurum Express. Check your connection and try again.", "Boarding Aurum Express", "All aboard"], ["鎏金列车即将进站", "正在准备黄金旅程…", "重试", "虚拟金币 · 无现金价值，不可提现", "无法开启鎏金列车，请检查网络后重试。", "正在登上鎏金列车", "欢迎进入"], ["鎏金列車即將進站", "正在準備黃金旅程…", "重試", "虛擬金幣 · 無現金價值，不可提現", "無法開啟鎏金列車，請檢查網路後重試。", "正在登上鎏金列車", "歡迎進入"], ["黄金列車がまもなく到着", "黄金の旅の準備中…", "再試行", "仮想コイン · 金銭的価値なし・換金不可", "オーラム・エクスプレスを開けません。接続を確認してください。", "黄金列車に乗車中", "ようこそ"], ["황금 열차가 도착합니다", "황금 여행을 준비하는 중…", "다시 시도", "가상 코인 · 현금 가치 없음・현금화 불가", "오럼 익스프레스을 열 수 없습니다. 연결을 확인하세요.", "황금 열차 탑승 중", "환영합니다"]][lang];
  document.documentElement.lang=['en','zh-CN','zh-TW','ja','ko'][lang];
  document.querySelector('.invitation').textContent=words[0];
  document.querySelector('.virtual-notice').textContent=words[3];
  copy.textContent=words[1];retry.textContent=words[2];
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
    fill.style.transform = `scaleX(${Math.max(0, Math.min(1, event.detail.progress))})`;
    const progress = Math.max(0, Math.min(1, event.detail.progress));
    vault.style.setProperty('--progress',String(progress));
    coin.style.left = `${4 + progress * 92}%`;
    track.classList.toggle('has-progress',progress>0.015);
    copy.textContent = `${words[5]} · ${Math.round(progress * 100)}%`;
  });
  const revealApp = () => {
    if (ready) return;
    ready = true;
    if (watchdog) window.clearTimeout(watchdog);
    fill.style.transform = 'scaleX(1)';
    coin.style.left = '96%';
    track.classList.add('has-progress');
    copy.textContent = words[6]+' · 100%';
    vault.classList.add('unlocked');
    window.setTimeout(() => loader.classList.add('is-ready'), 100);
    loader.setAttribute('aria-hidden', 'true');
    loader.addEventListener('transitionend', event => { if (event.target === loader) loader.remove(); });
    // Reduced-motion and interrupted transitions do not dispatch transitionend.
    window.setTimeout(() => loader.remove(), 700);
  };
  window.addEventListener('aurelia-app-ready', revealApp, { once: true });
  // Accept the legacy event during incremental installs so an older
  // cached application bundle can never strand players behind the loader.
  window.addEventListener('csw-app-ready', revealApp, { once: true });
  window.addEventListener('aurelia-load-error', fail);
  window.addEventListener('error', fail);
  if (window.__AURELIA_APP_READY__ === true) revealApp();
  watchdog = window.setTimeout(fail, 45000);
  document.getElementById('GameCanvas').addEventListener('contextmenu', event => event.preventDefault());
  System.import('./index.js').catch(error => { console.error('Unable to start Aurum Express.', error); fail(); });
}());
