'use strict';
(function bootstrapAurelia() {
  const loader = document.getElementById('csw-preloader');
  const fill = document.getElementById('loading-progress');
  const copy = document.getElementById('loading-copy');
  const vault = document.querySelector('.treasure-loading');
  const retry = document.getElementById('loading-retry');

  let locale='en';try{locale=localStorage.getItem('celestial-fortune-f22.locale.v1')||'en';}catch{}
  const lang=/^zh/i.test(locale)?(/TW|HK|Hant/i.test(locale)?2:1):/^ja/i.test(locale)?3:/^ko/i.test(locale)?4:0;
  const words=[["A WORLD OF FORTUNE AWAITS", "Gathering your good fortune…", "Try again", "Virtual coins · No cash value or cash-out", "Unable to open the treasury. Check your connection and try again.", "Opening treasury", "Welcome inside"], ["金色世界正在绽放", "正在收集金叶…", "重试", "虚拟金币 · 无现金价值，不可提现", "无法开启宝库，请检查网络后重试。", "正在开启宝库", "欢迎进入"], ["金色世界正在綻放", "正在收集金葉…", "重試", "虛擬金幣 · 無現金價值，不可提現", "無法開啟寶庫，請檢查網路後重試。", "正在開啟寶庫", "歡迎進入"], ["黄金の世界が花開く", "黄金の葉を集めています…", "再試行", "仮想コイン · 金銭的価値なし・換金不可", "宝庫を開けません。接続を確認して再試行してください。", "宝庫を開いています", "ようこそ"], ["황금 세계가 피어납니다", "황금 잎을 모으는 중…", "다시 시도", "가상 코인 · 현금 가치 없음・현금화 불가", "금고를 열 수 없습니다. 연결을 확인하고 다시 시도하세요.", "금고 여는 중", "환영합니다"]][lang];
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
    copy.textContent = `${words[5]} · ${Math.round(progress * 100)}%`;
  });
  const revealApp = () => {
    if (ready) return;
    ready = true;
    if (watchdog) window.clearTimeout(watchdog);
    fill.style.transform = 'scaleX(1)';
    copy.textContent = words[6]+' · 100%';
    vault.classList.add('unlocked');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const removeLoader = () => loader.remove();
    loader.addEventListener('transitionend', event => {
      if (event.target === loader && event.propertyName === 'opacity') removeLoader();
    });
    window.setTimeout(() => {
      loader.classList.add('is-ready');
      loader.setAttribute('aria-hidden', 'true');
      // Reduced motion has no transitionend; also cover interrupted transitions.
      window.setTimeout(removeLoader, reduced ? 0 : 650);
    }, reduced ? 0 : 450);
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
  System.import('./index.js').catch(error => { console.error('Unable to start Royal Jubilee.', error); fail(); });
}());
