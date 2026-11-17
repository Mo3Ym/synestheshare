(() => {
  const params = new URLSearchParams(location.search);
  const answer = params.get('r') || '';
  if (!/^[0-9ABC-]+$/.test(answer) || !/[0-9ABC]/.test(answer)) return;
  const mode = params.get('mode') || '10';
  const key = 'ss_result_intro_seen';
  const english = document.documentElement.lang === 'en';
  let fromDiagnosis = location.hash === '#submit';
  try {
    const voteKey = `ss_voted_${mode === 'number' || mode === 'subject' ? mode + '_' : ''}${answer}`;
    fromDiagnosis ||= sessionStorage.getItem('ss_from_alphabet') === '1' && sessionStorage.getItem('ss_vote_key') === voteKey;
    if (fromDiagnosis) { sessionStorage.setItem(key, '1'); return; }
    if (sessionStorage.getItem(key) === '1') return;
  } catch { if (fromDiagnosis) return; }

  const subject = mode === 'subject', number = mode === 'number';
  const sample = subject ? (english ? 'Lang' : '国語') : number ? '1' : 'A';
  const copy = english ? {
    title: `What color is your “${subject ? 'Language' : sample}”?`,
    description: `Compare the colors you associate with ${subject ? 'school subjects' : number ? 'numbers' : 'letters'}.`,
    view: 'See their results', start: 'Try it yourself (2 min) →', close: 'Close introduction',
  } : {
    title: `あなたの「${sample}」は、何色？`,
    description: `${subject ? '教科' : number ? '数字' : '文字'}に感じる色を、みんなと比べるサイトです。`,
    view: 'この人の結果を見る', start: '診断してみる（2分）', close: '説明を閉じる',
  };
  const dialog = document.createElement('dialog');
  dialog.className = 'result-intro';
  dialog.tabIndex = -1;
  dialog.dataset.mode = mode;
  dialog.setAttribute('aria-labelledby', 'result-intro-title');
  dialog.setAttribute('aria-describedby', 'result-intro-description');
  dialog.innerHTML = `<button class="result-intro-close" type="button" aria-label="${copy.close}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><div class="result-intro-colors" aria-hidden="true">${['#ff7f7f','#8edfff','#f5dc72'].map(color => `<span class="type-palette-dot result-intro-dot" style="background:${color};color:#fffdf9"><span>${sample}</span></span>`).join('')}</div><h2 id="result-intro-title">${copy.title}</h2><p id="result-intro-description" class="result-intro-description">${copy.description}</p><div class="result-intro-actions"><button class="result-intro-view" type="button">${copy.view}</button><a href="${english ? 'index-en' : 'index'}.html#themes">${copy.start}</a></div>`;
  document.body.appendChild(dialog);
  const remember = () => { try { sessionStorage.setItem(key, '1'); } catch {} };
  dialog.querySelector('.result-intro-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.result-intro-view').addEventListener('click', () => dialog.close());
  dialog.querySelector('a').addEventListener('click', remember);
  dialog.addEventListener('close', () => {
    remember();
    document.documentElement.classList.remove('result-intro-open');
    const result = document.getElementById('typeHeroArea');
    result?.setAttribute('tabindex', '-1');
    result?.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  document.documentElement.classList.add('result-intro-open');
  dialog.showModal();
  dialog.focus({ preventScroll: true });
})();
