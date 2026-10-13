'use strict';
(function bootstrapGoldenSymphony() {
  const loader = document.getElementById('csw-preloader');
  const fill = document.getElementById('loading-progress');
  const copy = document.getElementById('loading-copy');
  const retry = document.getElementById('loading-retry');
  const track = document.querySelector('.loading-track');

  let locale='en';try{locale=localStorage.getItem('golden-symphony-f43.locale.v1')||'en';}catch{}
  const lang=/^zh/i.test(locale)?(/TW|HK|Hant/i.test(locale)?2:1):/^ja/i.test(locale)?3:/^ko/i.test(locale)?4:0;
  const words=[["FOUR TREASURE CONCERTS","Opening Golden Symphony…","Try again","Virtual coins · No cash value or cash-out","Unable to open Golden Symphony. Check your connection and try again.","Preparing the concert","Welcome to Golden Symphony"],["四重财富乐章即将奏响","正在开启黄金交响殿堂…","重试","虚拟金币 · 无现金价值，不可提现","无法开启黄金交响殿堂，请检查网络后重试。","正在准备交响盛典","欢迎来到黄金交响殿堂"],["四重財富樂章即將奏響","正在開啟黃金交響殿堂…","重試","虛擬金幣 · 無現金價值，不可提現","無法開啟黃金交響殿堂，請檢查網路後重試。","正在準備交響盛典","歡迎來到黃金交響殿堂"],["四つの宝物のコンサートへ","Golden Symphonyを開いています…","再試行","仮想コイン · 金銭的価値なし・換金不可","Golden Symphonyを開けません。接続を確認して再試行してください。","コンサートを準備しています","Golden Symphonyへようこそ"],["네 가지 보물 콘서트","Golden Symphony을 여는 중…","다시 시도","가상 코인 · 현금 가치 없음・현금화 불가","Golden Symphony을 열 수 없습니다. 연결을 확인하고 다시 시도하세요.","콘서트를 준비합니다","Golden Symphony에 오신 것을 환영합니다"]][lang];
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
    // Reduced motion and interrupted transitions also retire the input overlay.
    window.setTimeout(() => loader.remove(), 480);
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
  System.import('./index.js').catch(error => { console.error('Unable to start Golden Symphony.', error); fail(); });
}());
