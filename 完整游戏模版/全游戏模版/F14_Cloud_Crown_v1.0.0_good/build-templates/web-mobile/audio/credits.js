// Credits are bundled, available offline, and discoverable from each game's settings.
(() => {
  let panel;
  window.addEventListener('game-music-credits', async () => {
    if (panel) return;
    const previousFocus = document.activeElement;
    panel = document.createElement('div'); panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Music credits');
    panel.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(18,16,29,.86);display:flex;align-items:center;justify-content:center;padding:calc(env(safe-area-inset-top) + 16px) 16px calc(env(safe-area-inset-bottom) + 16px);box-sizing:border-box;';
    const box = document.createElement('section');
    box.style.cssText = 'width:min(560px,100%);max-height:100%;display:flex;flex-direction:column;overflow:hidden;background:#292536;color:#fff3d9;border:1px solid #bfa773;border-radius:20px;box-sizing:border-box;text-align:left;font:16px/1.55 system-ui;-webkit-user-select:text;user-select:text;';
    const header = document.createElement('header');
    header.style.cssText = 'display:flex;align-items:center;gap:12px;padding:16px 20px;flex-shrink:0;border-bottom:1px solid #68593f;';
    const heading = document.createElement('h2'); heading.textContent = 'Music & sound credits';
    heading.id = 'music-credits-title'; heading.style.cssText = 'flex:1;margin:0;font-size:20px;';
    panel.setAttribute('aria-labelledby', heading.id);
    const close = document.createElement('button'); close.textContent = 'Close';
    close.style.cssText = 'min-height:44px;min-width:72px;flex-shrink:0;border-radius:12px;border:0;background:#edcf8e;color:#282132;font:600 16px system-ui;';
    const body = document.createElement('div'); body.textContent = 'Loading local credits…';
    body.tabIndex = 0;
    body.setAttribute('aria-label', 'Scrollable music and sound attribution');
    body.style.cssText = 'overflow:auto;min-height:0;padding:0 20px 20px;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;';
    header.append(heading, close); box.append(header, body); panel.append(box); document.body.append(panel);
    const restore = () => { panel?.remove(); panel = undefined; window.removeEventListener('keydown', key); previousFocus?.focus?.(); };
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); restore(); }
      if (e.key === 'Tab') {
        const order = [close, body], index = order.indexOf(document.activeElement);
        e.preventDefault(); order[(index + (e.shiftKey ? -1 : 1) + order.length) % order.length].focus();
      }
    };
    close.onclick = restore; panel.onclick = e => { if (e.target === panel) restore(); };
    window.addEventListener('keydown', key); close.focus();
    try {
      const response = await fetch('audio/credits.json'); if (!response.ok) throw Error(response.status);
      const credits = await response.json(); body.textContent = '';
      for (const track of credits.music) {
        const p = document.createElement('p');
        p.textContent = `${track.role || track.label || track.id}: “${track.title}” — ${track.artist}. ${track.attribution || ''} Licensed under ${track.license}. Changes: ${track.modifications}.`;
        p.style.overflowWrap = 'anywhere'; body.append(p);
        for (const [label, url] of [['Source', track.sourcePage], ['License', track.licenseUrl]]) {
          if (!url || !/^https:\/\//.test(url)) continue;
          const link = document.createElement('a'); link.textContent = label;
          link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
          link.style.cssText = 'color:#ffe0a1;display:inline-block;margin:0 20px 8px 0;min-height:44px;line-height:44px;';
          body.append(link);
        }
      }
      const p = document.createElement('p');
      p.textContent = `Short sound effects: ${credits.effects.artist}. ${credits.effects.license}. ${credits.effects.licenseUrl} Source: ${credits.effects.sourceUrl}. ${credits.effects.modifications}`;
      p.style.overflowWrap = 'anywhere'; body.append(p);
    } catch { body.textContent = 'Unable to load the bundled music credits. Please reopen this page.'; }
  });
})();
