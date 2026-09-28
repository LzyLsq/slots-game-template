'use strict';
(function bootstrapFortuneFoundry() {
  const loader = document.getElementById('csw-preloader');
  const fill = document.querySelector('.loading-fill-clip');
  const track = document.querySelector('.loading-track');
  const copy = document.getElementById('loading-copy');
  const retry = document.getElementById('loading-retry');

  let locale='en';try{locale=localStorage.getItem('fortune-foundry-f32.locale.v1')||'en';}catch{}
  const lang=/^zh/i.test(locale)?(/TW|HK|Hant/i.test(locale)?2:1):/^ja/i.test(locale)?3:/^ko/i.test(locale)?4:0;
  const words=[["FORTUNE LINE IGNITED", "Heating the coin die…", "Try again", "Virtual coins · No cash value or cash-out", "Unable to start the mint line. Check your connection and try again.", "Opening mint floor", "Welcome to Fortune Foundry"], ["福运铸币线已点亮", "正在加热铸币模具…", "重试", "虚拟金币 · 无现金价值，不可提现", "无法启动铸币线，请检查网络后重试。", "正在开启铸币大厅", "欢迎来到福运铸币工坊"], ["福運鑄幣線已點亮", "正在加熱鑄幣模具…", "重試", "虛擬金幣 · 無現金價值，不可提現", "無法啟動鑄幣線，請檢查網路後重試。", "正在開啟鑄幣大廳", "歡迎來到福運鑄幣工坊"], ["幸運の鋳造ラインが点灯", "コイン金型を加熱中…", "再試行", "仮想コイン · 金銭的価値なし・換金不可", "鋳造ラインを起動できません。接続を確認して再試行してください。", "鋳造ホールを開いています", "フォーチュン・ファウンドリーへようこそ"], ["행운 주조 라인 점화", "코인 금형 가열 중…", "다시 시도", "가상 코인 · 현금 가치 없음・현금화 불가", "주조 라인을 시작할 수 없습니다. 연결을 확인하고 다시 시도하세요.", "주조 홀 여는 중", "포춘 파운드리에 오신 것을 환영합니다"]][lang]
  document.documentElement.lang=['en','zh-CN','zh-TW','ja','ko'][lang];
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
  window.addEventListener('foundry-load-progress', event => {
    fill.style.clipPath = `inset(0 ${Math.round((1 - Math.max(0, Math.min(1, event.detail.progress))) * 100)}% 0 0)`;
    const progress = Math.max(0, Math.min(1, event.detail.progress));
    track.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    copy.textContent = `${words[5]} · ${Math.round(progress * 100)}%`;
  });
  const revealApp = () => {
    if (ready) return;
    ready = true;
    if (watchdog) window.clearTimeout(watchdog);
    fill.style.clipPath = 'inset(0 0 0 0)';
    track.setAttribute('aria-valuenow', '100');
    copy.textContent = words[6]+' · 100%';
    window.setTimeout(() => loader.classList.add('is-ready'), 450);
    loader.setAttribute('aria-hidden', 'true');
    loader.addEventListener('transitionend', () => loader.remove(), { once: true });
  };
  window.addEventListener('foundry-app-ready', revealApp, { once: true });
  // Accept the legacy app-ready event during incremental installs so an older
  // cached application bundle can never strand players behind the loader.
  window.addEventListener('csw-app-ready', revealApp, { once: true });
  window.addEventListener('foundry-load-error', fail);
  window.addEventListener('error', fail);
  if (window.__AURELIA_APP_READY__ === true) revealApp();
  watchdog = window.setTimeout(fail, 45000);
  document.getElementById('GameCanvas').addEventListener('contextmenu', event => event.preventDefault());
  System.import('./index.js').catch(error => { console.error('Unable to start Fortune Foundry.', error); fail(); });
}());
