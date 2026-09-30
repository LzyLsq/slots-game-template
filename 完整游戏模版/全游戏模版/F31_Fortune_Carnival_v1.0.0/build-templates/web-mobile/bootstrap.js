'use strict';
(function bootstrapFortuneCarnival() {
  const loader = document.getElementById('csw-preloader');
  const fill = document.getElementById('loading-progress');
  const copy = document.getElementById('loading-copy');
  const vault = document.querySelector('.treasure-loading');
  const retry = document.getElementById('loading-retry');

  let locale='en';try{locale=localStorage.getItem('fortune-carnival-f31.locale.v1')||'en';}catch{}
  const lang=/^zh/i.test(locale)?(/TW|HK|Hant/i.test(locale)?2:1):/^ja/i.test(locale)?3:/^ko/i.test(locale)?4:0;
  const words=[["THE SKY CITY IS OPENING", "Minting your carnival pass…", "Try again", "Virtual coins · No cash value or cash-out", "Unable to open Fortune Carnival. Check your connection and try again.", "Opening sky city", "Welcome inside"], ["云上嘉年华即将开启", "正在铸造嘉年华通行证…", "重试", "虚拟金币 · 无现金价值，不可提现", "无法开启福运嘉年华，请检查网络后重试。", "正在开启云上城", "欢迎进入"], ["雲上嘉年華即將開啟", "正在鑄造嘉年華通行證…", "重試", "虛擬金幣 · 無現金價值，不可提現", "無法開啟福運嘉年華，請檢查網路後重試。", "正在開啟雲上城", "歡迎進入"], ["天空のカーニバルが開幕します", "カーニバルパスを鋳造中…", "再試行", "仮想コイン · 金銭的価値なし・換金不可", "フォーチュンカーニバルを開けません。接続を確認してください。", "天空都市を開いています", "ようこそ"], ["하늘 카니발이 곧 열립니다", "카니발 패스를 주조하는 중…", "다시 시도", "가상 코인 · 현금 가치 없음・현금화 불가", "포춘 카니발을 열 수 없습니다. 연결을 확인하세요.", "하늘 도시 여는 중", "환영합니다"]][lang];
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
    window.setTimeout(() => loader.classList.add('is-ready'), 450);
    loader.setAttribute('aria-hidden', 'true');
    loader.addEventListener('transitionend', () => loader.remove(), { once: true });
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
  System.import('./index.js').catch(error => { console.error('Unable to start Fortune Carnival.', error); fail(); });
}());
