(() => {
  const palette = document.querySelector('.try-palette');
  const feedback = document.querySelector('.try-feedback');
  const card = feedback.closest('.try-card');
  const alphabetLink = document.querySelector('.theme-card[href^="alphabet"]');
  const alphabetHref = alphabetLink.getAttribute('href');
  const english = document.documentElement.lang === 'en';
  // The Japanese names are the field names in statistics/A.
  const colors = [
    ['#ff7f7f', '赤', 'Red'], ['#ffae66', '橙', 'Orange'], ['#f5dc72', '黄', 'Yellow'],
    ['#a8d85c', '黄緑', 'Lime'], ['#67bf92', '緑', 'Green'], ['#4da8e8', '青', 'Blue'],
    ['#8edfff', '水色', 'Sky blue'], ['#9272ff', '紫', 'Purple'], ['#ee9fd0', 'ピンク', 'Pink'],
    ['#9f6f4f', '茶色', 'Brown'], ['#2b2d38', '黒', 'Black'], ['#9698a8', 'グレー', 'Gray'],
    ['#fffdf9', '白', 'White'],
  ].map(([hex, key, en]) => ({ hex, key, name: english ? en : key }));

  for (const color of colors) {
    const label = document.createElement('label');
    label.className = 'try-choice';
    label.style.setProperty('--swatch', color.hex);
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'try-color';
    input.value = color.key;
    input.setAttribute('aria-label', color.name);
    label.title = color.name;
    const orb = document.createElement('span');
    orb.className = 'type-palette-dot try-orb';
    if (color.key === '白') orb.dataset.bright = '1';
    orb.setAttribute('aria-hidden', 'true');
    orb.textContent = 'A';
    label.append(input, orb);
    palette.append(label);
  }

  async function readDistribution() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const url = 'https://firestore.googleapis.com/v1/projects/synestheshare/databases/(default)/documents/statistics/A';
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('Statistics unavailable');
      const { fields } = await response.json();
      const counts = colors.map(({ key }) => Number(fields?.[key]?.integerValue || 0));
      if (counts.some(count => count > 0)) return { counts, sample: false };
    } catch {
      // The walkthrough also works offline with a clearly labelled example.
    } finally {
      clearTimeout(timeout);
    }
    return { counts: colors.map(({ key }) => ({ 赤: 92, 青: 8 })[key] || 0), sample: true };
  }

  function colorText(color) {
    const name = document.createElement('span');
    name.style.color = ['黒', '茶色'].includes(color.key) ? '#fff' : color.hex;
    name.textContent = english ? color.name.toLowerCase() : color.name;
    return name;
  }

  function draw({ counts, sample }, choice) {
    const total = counts.reduce((sum, count) => sum + count, 0);
    const rows = colors.map((color, i) => ({ ...color, share: counts[i] * 100 / total }))
      .filter(row => row.share > 0).sort((a, b) => b.share - a.share || a.key.localeCompare(b.key));
    // Match the result page's whole percentages while retaining exact segment widths.
    rows.forEach(row => { row.pct = Math.floor(row.share); });
    const remainder = 100 - rows.reduce((sum, row) => sum + row.pct, 0);
    [...rows].sort((a, b) => (b.share - b.pct) - (a.share - a.pct))
      .slice(0, remainder).forEach(row => row.pct++);

    const summary = document.createElement('p');
    summary.className = 'try-summary';
    summary.textContent = sample ? (english ? 'Example distribution' : '回答の分布（例）') : (english ? 'Colors people see' : 'みんなが感じた色');
    const selected = rows.find(row => row.key === choice);

    const bar = document.createElement('div');
    bar.className = 'try-track';
    const legend = document.createElement('ul');
    legend.className = 'try-legend';
    let offset = 0;
    for (const [index, row] of rows.entries()) {
      const segment = document.createElement('span');
      segment.style.setProperty('--share', row.share + '%');
      segment.style.setProperty('--delay', index * 40 + 'ms');
      segment.style.setProperty('--swatch', row.hex);
      bar.append(segment);
      if (row === selected) {
        const marker = document.createElement('div');
        marker.className = 'try-marker';
        marker.textContent = english ? 'You' : 'あなた';
        marker.style.setProperty('--marker', (offset + row.share / 2) + '%');
        marker.style.setProperty('--marker-delay', 750 + index * 40 + 'ms');
        bar.append(marker);
      }
      offset += row.share;
      const item = document.createElement('li');
      item.style.setProperty('--swatch', row.hex);
      item.textContent = row.name + ' ' + row.pct + '%';
      legend.append(item);
    }
    card.parentElement.style.setProperty('--last-segment-delay', (rows.length - 1) * 40 + 'ms');
    card.classList.add('has-results');
    const result = document.createElement('p');
    result.className = 'try-match';
    const comparison = selected ?? rows[0];
    const percentage = document.createElement('strong');
    percentage.className = 'try-match-percent';
    percentage.textContent = comparison.pct ? `${comparison.pct}%` : '<1%';
    const letter = document.createElement('strong');
    letter.textContent = 'A';
    const reflection = document.createElement('p');
    reflection.className = 'try-reflection';
    if (selected) {
      const color = colorText(selected);
      if (english) result.append(percentage, ' of people saw the same ', color, ' in ', letter, ' as you.');
      else result.append(percentage, 'の人が、', letter, 'にあなたと同じ', color, 'を感じていました！');
      reflection.textContent = english
        ? 'That feeling quietly resonates with others.'
        : 'その感覚は、多くの人の心と静かに重なっています。';
    } else {
      const popularColor = colorText(comparison);
      const chosenColor = colorText(colors.find(color => color.key === choice));
      const wrapOpportunity = document.createElement('wbr');
      if (english) result.append(percentage, ' saw ', popularColor, ' in ', letter, '.', wrapOpportunity, ' You saw ', chosenColor, '.');
      else result.append(percentage, 'が', popularColor, 'を選ぶ', letter, 'に、', wrapOpportunity, 'あなたは', chosenColor, 'を見ていました！');
      reflection.textContent = english ? 'A color all your own.' : '誰とも重ならない、あなただけの色。';
    }
    const results = document.createElement('div');
    results.className = 'try-results';
    results.append(summary, bar, legend, result, reflection);
    feedback.replaceChildren(results);
    const updateLegendFocus = () => {
      if (legend.scrollHeight > legend.clientHeight) legend.tabIndex = 0;
      else legend.removeAttribute('tabindex');
    };
    updateLegendFocus();
    feedback.addEventListener('transitionend', updateLegendFocus, { once: true });
  }

  palette.addEventListener('change', async ({ target }) => {
    const choice = target.value;
    const colorIndex = colors.findIndex(color => color.key === choice);
    const alphabetUrl = new URL(alphabetHref, location.href);
    alphabetUrl.searchParams.set('mode', '10');
    alphabetUrl.searchParams.set('r', '0123456789ABC'[colorIndex] + '---------');
    alphabetLink.href = alphabetUrl.href;
    palette.querySelectorAll('input').forEach(input => { input.disabled = true; });
    palette.classList.add('has-choice');
    feedback.textContent = english ? 'Loading responses…' : 'みんなの回答を読み込み中…';
    draw(await readDistribution(), choice);
  }, { once: true });

  // A new visit to the theme chooser starts a new diagnosis.
  window.addEventListener('pagehide', () => alphabetLink.setAttribute('href', alphabetHref));
})();
