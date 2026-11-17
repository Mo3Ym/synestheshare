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
    description: subject ? 'Choose the colors you associate with school subjects and compare them with others.' : 'Choose the colors you associate with letters or numbers and compare them with others.',
    context: 'You’re viewing someone’s shared color results.',
    view: 'See their results', start: 'Find your colors (2 min) →', close: 'Close introduction',
  } : {
    title: `あなたの「${sample}」は、何色？`,
    description: subject ? '国語や数学から思い浮かぶ色を選び、みんなの感覚と比べるサイトです。' : '文字や数字から思い浮かぶ色を選び、みんなの感覚と比べるサイトです。',
    context: 'このページは、シェアされた診断結果です。',
    view: 'この人の結果を見る', start: '自分も診断する（約2分） →', close: '説明を閉じる',
  };
  const dialog = document.createElement('dialog');
  dialog.className = 'result-intro';
  dialog.dataset.mode = mode;
  dialog.setAttribute('aria-labelledby', 'result-intro-title');
  dialog.setAttribute('aria-describedby', 'result-intro-description result-intro-context');
  dialog.innerHTML = `<button class="result-intro-close" type="button" aria-label="${copy.close}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><p class="result-intro-brand">SynestheShare</p><div class="result-intro-colors" aria-hidden="true">${Array.from({ length: 3 }, () => `<span class="result-intro-dot">${sample}</span>`).join('')}</div><h2 id="result-intro-title">${copy.title}</h2><p id="result-intro-description" class="result-intro-description">${copy.description}</p><p id="result-intro-context" class="result-intro-context">${copy.context}</p><div class="result-intro-actions"><button class="result-intro-view" type="button" autofocus>${copy.view}</button><a href="${english ? 'index-en' : 'index'}.html#themes">${copy.start}</a></div>`;
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
})();
