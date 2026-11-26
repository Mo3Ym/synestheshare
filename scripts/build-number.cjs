// Keep the number picker in sync with the alphabet picker's layout and behavior.
const fs = require('node:fs');
let page = fs.readFileSync('alphabet.html', 'utf8');
page = page.replace('アルファベット診断', '数字診断')
  .replaceAll('A〜Z', '0〜9')
  .replace('<strong class="hl-red">文字</strong>に色をつけよう。', '<strong class="hl-red">0〜9</strong>は<wbr>何色ですか？')
  .replace('色を選んだ文字', '色を選んだ数字')
  .replace('    <h1 class="page-title">', '    <div class="page-eyebrow">No. 02 — Numbers</div>\n    <h1 class="page-title">')
  .replaceAll('アルファベット', '数字');
page = page.replace("const LETTERS_10 = ['A','B','C','D','E','F','G','X','Y','Z'];", "const LETTERS_10 = '1234567890'.split('');")
  .replace(/const LETTERS_26 = .*?;\r?\n/, '')
  .replace(/let isFullMode = .*?;[^\n]*\r?\n/, '')
  .replace("if (modeParam === '26') isFullMode = true;", '')
  .replaceAll('isFullMode ? LETTERS_26 : LETTERS_10', 'LETTERS_10')
  .replaceAll("${isFullMode ? '26' : '10'}", 'number')
  .replace("alphaGrid.className = 'alpha-grid ' + (isFullMode ? 'mode-26' : 'mode-10');", "alphaGrid.className = 'alpha-grid mode-10';");
page = page.replace(/\s*<div class="mode-toggle-row">[\s\S]*?<\/div>/, '')
  .replace(/\n  if \(btnModeToggle\) \{[\s\S]*?\n  \}/, '')
  .replace(/const btnModeToggle\s*=.*?;\r?\n/, '')
  .replace(/const modeToggleLabel\s*=.*?;\r?\n/, '')
  .replace(/btnModeToggle\.addEventListener\('click',[\s\S]*?\n\}\);/, '');
page = page.replace('`ss_voted_${encoded}`', '`ss_voted_number_${encoded}`')
  .replace("  sessionStorage.setItem('ss_from_alphabet', '1');", `  const alreadyVoted = localStorage.getItem('ss_submitted_number') === '1';
  if (!alreadyVoted) {
    sessionStorage.setItem('ss_from_alphabet', '1');
    sessionStorage.removeItem(voteKey);
  } else {
    sessionStorage.removeItem('ss_from_alphabet');
  }`);
page = page.replace('  if (rParam) {', `  if (!rParam) {
    // Preserve choices from the previous number page's per-digit color URLs.
    for (const digit of LETTERS_10) {
      const value = params.get(digit);
      if (!/^#[0-9a-f]{6}$/i.test(value || '')) continue;
      const rgb = hex => [1,3,5].map(offset => parseInt(hex.slice(offset,offset+2),16));
      const selected = rgb(value);
      colorMap[digit] = PRESET_COLORS.slice().sort((a,b) => {
        const distance = hex => rgb(hex).reduce((sum,channel,i) => sum + (channel-selected[i]) ** 2,0);
        return distance(a)-distance(b);
      })[0];
    }
  }
  if (rParam) {`);
fs.writeFileSync('number.html', page.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Built the modern 1–9 and 0 number picker.');
