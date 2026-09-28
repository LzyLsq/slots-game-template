'use strict';
(function bootstrapAurelia() {
  const loader = document.getElementById('csw-preloader');
  const fill = document.getElementById('loading-progress');
  const copy = document.getElementById('loading-copy');
  const retry = document.getElementById('loading-retry');
  const track = document.querySelector('.loading-track');

  let locale='en';try{locale=localStorage.getItem('golden-library-f33.locale.v1')||'en';}catch{}
  const lang=/^zh/i.test(locale)?(/TW|HK|Hant/i.test(locale)?2:1):/^ja/i.test(locale)?3:/^ko/i.test(locale)?4:0;
  const words=[["FOUR COLLECTIONS OF FORTUNE", "Illuminating the library…", "Try again", "Virtual coins · No cash value or cash-out", "Unable to open the library. Check your connection and try again.", "Opening library", "Welcome to the library"], ["四座黄金典藏即将开启", "正在点亮黄金图书馆…", "重试", "虚拟金币 · 无现金价值，不可提现", "无法开启图书馆，请检查网络后重试。", "正在开启图书馆", "欢迎来到图书馆"], ["四座黃金典藏即將開啟", "正在點亮黃金圖書館…", "重試", "虛擬金幣 · 無現金價值，不可提現", "無法開啟圖書館，請檢查網路後重試。", "正在開啟圖書館", "歡迎來到圖書館"], ["黄金図書館の四つの収蔵室へ", "黄金図書館を照らしています…", "再試行", "仮想コイン · 金銭的価値なし・換金不可", "図書館を開けません。接続を確認して再試行してください。", "図書館を開いています", "ようこそ"], ["황금 도서관의 네 소장실로", "황금 도서관을 밝히는 중…", "다시 시도", "가상 코인 · 현금 가치 없음・현금화 불가", "도서관을 열 수 없습니다. 연결을 확인하고 다시 시도하세요.", "도서관 여는 중", "환영합니다"]][lang];
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
    track.setAttribute('aria-valuetext', words[4]);
  };
  retry.addEventListener('click', () => location.reload());
  window.addEventListener('aurelia-load-progress', event => {
    if (ready || loader.classList.contains('has-error')) return;
    const raw = Number(event.detail?.progress);
    if (!Number.isFinite(raw)) return;
    const progress = Math.max(0, Math.min(1, raw));
    loader.classList.add('has-progress');
    fill.style.transform = `scaleX(${progress})`;
    track.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    track.removeAttribute('aria-valuetext');
    copy.textContent = `${words[5]} · ${Math.round(progress * 100)}%`;
  });
  const revealApp = () => {
    if (ready) return;
    ready = true;
    if (watchdog) window.clearTimeout(watchdog);
    loader.classList.add('has-progress');
    fill.style.transform = 'scaleX(1)';
    track.setAttribute('aria-valuenow', '100');
    track.removeAttribute('aria-valuetext');
    copy.textContent = words[6]+' · 100%';
    window.setTimeout(() => loader.classList.add('is-ready'), 180);
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
  System.import('./index.js').catch(error => { console.error('Unable to start Golden Library.', error); fail(); });
}());
