(() => {
  const pages = ['index', 'alphabet', 'result', 'number', 'subject'];
  const current = location.pathname.split('/').pop().replace(/\.html$/, '') || 'index';
  const english = current.endsWith('-en');
  const page = current.replace(/-en$/, '');
  if (!pages.includes(page)) return;
  const host = document.querySelector('nav .nav-right') || document.body.appendChild(document.createElement('div'));
  if (!host.classList.contains('nav-right')) host.className = 'legacy-language';
  const menu = document.createElement('div');
  menu.className = 'language-menu';
  const japaneseFlag = '<svg viewBox="0 0 24 16" aria-hidden="true"><path fill="#fff" d="M0 0h24v16H0z"/><circle fill="#bc002d" cx="12" cy="8" r="4.8"/></svg>';
  const globe = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>';
  menu.innerHTML = `<button type="button" class="language-trigger" aria-label="${english ? 'Select language' : '言語を選択'}" aria-expanded="false" aria-controls="language-options">${english ? globe : japaneseFlag}<span>${english ? 'EN' : 'JP'}</span></button><div class="language-options" id="language-options" hidden><a href="#" lang="${english ? 'ja' : 'en'}">${english ? japaneseFlag + ' JP' : globe + ' EN'}</a></div>`;
  host.prepend(menu);
  const trigger = menu.querySelector('button');
  const options = menu.querySelector('.language-options');
  const link = options.querySelector('a');
  function close() { options.hidden = true; trigger.setAttribute('aria-expanded', 'false'); }
  function targetUrl() {
    const target = new URL(location.href);
    target.pathname = target.pathname.replace(/[^/]*$/, `${page}${english ? '' : '-en'}.html`);
    if (english) target.searchParams.delete('lang');
    else target.searchParams.set('lang', 'en');
    return target.href;
  }
  trigger.addEventListener('click', () => {
    link.href = targetUrl();
    options.hidden = !options.hidden;
    trigger.setAttribute('aria-expanded', String(!options.hidden));
  });
  document.addEventListener('click', event => { if (!menu.contains(event.target)) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { close(); trigger.focus(); } });
  link.addEventListener('click', () => {
    link.href = targetUrl();
  });
})();
