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
  const japaneseFlag = '<svg class="language-flag" viewBox="0 0 24 16" aria-hidden="true"><rect x=".5" y=".5" width="23" height="15" rx="1" fill="#fff" stroke="#607089" stroke-opacity=".32" stroke-width="1" vector-effect="non-scaling-stroke"/><circle fill="#bc002d" cx="12" cy="8" r="4.8"/></svg>';
  const globe = '<svg class="language-globe" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#8edfff" stroke="#5a9bc1" stroke-opacity=".65" stroke-width=".8"/><path d="m5.1 5.8 4.3-1.5 2.9 2-1.1 2.9-3 .7-.9 3-2.9-1.3-.9-2.7Zm8.9 5.9 3.8-1.1 2.7 2.5-1.8 3.6-2.7.7-1.3 3.6-2.3-1.6-.5-3.8Z" fill="#67bf92"/><path d="M5.3 18.8a9.5 9.5 0 0 0 13-.2" stroke="#fff" stroke-opacity=".55" stroke-width=".8" stroke-linecap="round"/></svg>';
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
