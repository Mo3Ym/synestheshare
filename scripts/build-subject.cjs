// The subject picker shares the number/alphabet picker rather than the legacy canvas UI.
const fs = require('node:fs');
let page = fs.readFileSync('number.html', 'utf8');
const labels = { language:'国語', math:'数学', science:'理科', social:'社会', english:'英語' };
page = page.replaceAll('数字', '教科').replaceAll('0〜9','教科')
  .replaceAll('すべての文字に', 'すべての教科に')
  .replaceAll('文字を選んで色をつけよう', '教科を選んで色をつけよう')
  .replaceAll('${done}文字に色が設定されています', '${done}教科に色が設定されています')
  .replaceAll('No. 02 — Numbers','No. 04 — Subjects')
  .replace("const LETTERS_10 = '1234567890'.split('');", `const LETTER_LABELS = ${JSON.stringify(labels)};\nconst LETTERS_10 = Object.keys(LETTER_LABELS);`)
  .replaceAll('mode=number','mode=subject')
  .replaceAll('ss_submitted_number','ss_submitted_subject')
  .replaceAll('ss_voted_number_','ss_voted_subject_')
  .replace('params.get(digit)', 'params.get(digit) || params.get(LETTER_LABELS[digit])')
  .replace('cell.innerHTML = `<div class="alpha-bubble"><span>${l}</span></div>`;', 'cell.innerHTML = `<div class="alpha-bubble"><span>${LETTER_LABELS[l]}</span></div>`;')
  .replaceAll('${letter} の色', '${LETTER_LABELS[letter]} の色')
  .replace('pickerPreview.textContent = letter;', 'pickerPreview.textContent = LETTER_LABELS[letter];')
  .replace('item.textContent = l;', 'item.textContent = LETTER_LABELS[l];')
  .replace("(d * 0.44) + 'px'", "Math.min(d * 0.36, d * 1.4 / Math.max(...cell.querySelector('span').textContent.split(/\\s+/).map(word => word.length))) + 'px'");
page = page.replace('</style>', `.alpha-grid.mode-10 { grid-template-columns: repeat(3, 1fr); max-width: 480px; }
.alpha-bubble span { white-space: normal; line-height: 1.15; max-width: 88%; }
.picker-letter-preview { font-size: 0.85rem; line-height: 1.15; text-align: center; overflow-wrap: anywhere; }
</style>`);
fs.writeFileSync('subject.html',page.replace(/\r\n/g,'\n').replace(/[ \t]+$/gm,''));
console.log('Built the subject picker for language, math, science, social studies and English.');
