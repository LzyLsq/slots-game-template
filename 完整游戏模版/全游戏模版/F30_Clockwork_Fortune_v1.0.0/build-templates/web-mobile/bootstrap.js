'use strict';
(function bootstrapAurelia() {
  const loader = document.getElementById('csw-preloader');
  const fill = document.getElementById('loading-progress');
  const copy = document.getElementById('loading-copy');
  const vault = document.querySelector('.treasure-loading');
  const retry = document.getElementById('loading-retry');
  const track = document.querySelector('.loading-track');

  let locale='en';try{locale=localStorage.getItem('clockwork-fortune-f30.locale.v1')||'en';}catch{}
  const lang=/^zh/i.test(locale)?(/TW|HK|Hant/i.test(locale)?2:1):/^ja/i.test(locale)?3:/^ko/i.test(locale)?4:0;
  const words=[["A TREASURY OF TIME AWAITS", "Winding the golden clock…", "Try again", "Virtual coins · No cash value or cash-out", "Unable to open the treasury. Check your connection and try again.", "Opening treasury", "Welcome inside"], ["钟表宝库即将开启", "正在启动黄金齿轮…", "重试", "虚拟金币 · 无现金价值，不可提现", "无法开启宝库，请检查网络后重试。", "正在开启宝库", "欢迎进入"], ["鐘錶寶庫即將開啟", "正在啟動黃金齒輪…", "重試", "虛擬金幣 · 無現金價值，不可提現", "無法開啟寶庫，請檢查網路後重試。", "正在開啟寶庫", "歡迎進入"], ["時計仕掛けの宝庫へ", "黄金の歯車を動かしています…", "再試行", "仮想コイン · 金銭的価値なし・換金不可", "宝庫を開けません。接続を確認して再試行してください。", "宝庫を開いています", "ようこそ"], ["시계 장치 보물 창고로", "황금 톱니바퀴를 움직이는 중…", "다시 시도", "가상 코인 · 현금 가치 없음・현금화 불가", "금고를 열 수 없습니다. 연결을 확인하고 다시 시도하세요.", "금고 여는 중", "환영합니다"]][lang];
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
    vault.style.setProperty('--progress',String(progress));
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
    vault.classList.add('unlocked');
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
  System.import('./index.js').catch(error => { console.error('Unable to start Clockwork Fortune.', error); fail(); });
}());
