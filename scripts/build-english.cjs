// English pages are generated from the Japanese sources and reviewed copy.
const fs = require('node:fs');
const path = require('node:path');
const copy = require('./english-copy.cjs');
const root = path.resolve(__dirname, '..');
const pages = ['index', 'alphabet', 'result', 'number', 'subject'];
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = new RegExp(Object.keys(copy).sort((a,b) => b.length - a.length).map(escape).join('|'), 'g');

function translate(source) {
  return source.replace(pattern, value => copy[value]);
}

for (const page of pages) {
  const original = fs.readFileSync(path.join(root, `${page}.html`), 'utf8');
  let source = original
    .replaceAll(".replace(/<wbr>/g, '')", ".replace(/<wbr\\s*\\/?\\s*>/g, '')")
    .replace(/<wbr\s*\/?\s*>/g, '');
  // Translate complete templates where English requires a different word order.
  const templates = {
    '診断結果。多数派一致率 ${diag.majorityRate}%、${rareStat.label} 上位${rareStat.value}%': '${diag.majorityRate}% majority match. ${rareStat.label}: top ${rareStat.value}%.',
    '${done}文字に色が設定されています': '${done} letters colored',
    '${done}教科に色が設定されています': '${done} subjects colored',
    '${letter} の色を選択': 'Choose a color for ${letter}',
    '${l} の色を選択': 'Choose a color for ${l}',
    '${letter}の色をクリアしました': 'Cleared the color for ${letter}',
    '${letter} の色をクリアしました': 'Cleared the color for ${letter}',
    '${LETTER_LABELS[letter]} の色を選択': 'Choose a color for ${LETTER_LABELS[letter]}',
    '${LETTER_LABELS[letter]} の色をクリアしました': 'Cleared the color for ${LETTER_LABELS[letter]}',
    '${letters.length}文字': '${letters.length} letters',
    '色を1つ以上設定してから結果を見よう': 'Choose at least one color to see your results',
    'あなたの<strong class="hl-red">A</strong>は何<strong class="hl-mint">色</strong>ですか？': 'What <strong class="hl-mint">color</strong> is your <strong class="hl-red">A</strong>?',
    '世間の${topPct}%が${votes[0].name}を選ぶ${mostUnique}に、あなたは${getColorName(myColor)}を見ていました。': '${topPct}% chose ${votes[0].name} for ${mostUnique}. You saw ${getColorName(myColor)}.',
    '${majorityVote.pct}%が${getColorName(majorityVote.color)}を選ぶ${itemLabel(mostUnique)}に、あなたは${getColorName(colorMap[mostUnique])}を見ていました。': '${majorityVote.pct}% chose ${getColorName(majorityVote.color)} for ${itemLabel(mostUnique)}. You saw ${getColorName(colorMap[mostUnique])}.',
    '<span class="sense-strong">${uTopPct}%</span>が${senseColorWord(uTopColorHex)}を選ぶ${mostUnique}に、': '<span class="sense-strong">${uTopPct}%</span> chose ${senseColorWord(uTopColorHex)} for ${mostUnique}.',
    '<span class="sense-strong">あなた</span>は${senseColorWord(uColor)}を見ていました。': '<span class="sense-strong">You</span> saw ${senseColorWord(uColor)}.',
    '<span class="sense-strong">${highestPct}%</span>の人が、${itemLabel(mostEmpathy)}にあなたと同じ${empathyColor}を感じていました。': '<span class="sense-strong">${highestPct}%</span> chose the same ${empathyColor} as you for ${itemLabel(mostEmpathy)}.',
    '（${diag.majorityCount}/${diag.total}文字が世間と一致）': '(${diag.majorityCount}/${diag.total} letters match the majority)',
    '最も個性的な文字：${uniqueText}': 'Most distinctive letter: ${uniqueText}',
    '最も共感された文字：${empathyText}': 'Most shared letter: ${empathyText}',
    '🎨あなたの文字色感覚は、${rareStat.label}上位${rareStat.value}%でした。': '🎨Your letter-color sense ranked in the top ${rareStat.value}% for ${rareStat.label.toLowerCase()}.',
    '🎨あなたの${senseName}は、${rareStat.label}上位${rareStat.value}%でした。': '🎨Your ${senseName} ranked in the top ${rareStat.value}% for ${rareStat.label.toLowerCase()}.',
    '――あなたの「${isNumberMode ? \'1\' : \'A\'}」は、何色ですか？': '— What color is your “${isNumberMode ? \'1\' : \'A\'}”?',
    '――あなたの「${isSubjectMode ? \'国語\' : isNumberMode ? \'1\' : \'A\'}」は、何色ですか？': '— What color is your “${isSubjectMode ? \'Japanese\' : isNumberMode ? \'1\' : \'A\'}”?',
    '🎨私の数字の色は ${type.name} でした。': '🎨My number colors are ${type.name}.',
    '🎨私の${themeName}の色は ${type.name} でした。': '🎨My ${isSubjectMode ? \'school-subject\' : \'number\'} colors are ${type.name}.',
    '――あなたの「${sampleItem}」は、何色ですか？': '— What color is your “${sampleItem}”?',
    '――あなたの「1」は、何色ですか？': '— What color is your “1”?',
    '――あなたの「A」は、何色ですか？': '— What color is your “A”?',
    'あなたの文字色感覚は...${rareStat.label} 上位${rareStat.value}%選んだ文字の色と診断結果': 'Your letter-color sense: top ${rareStat.value}% for ${rareStat.label.toLowerCase()}. Your colors and results.',
  };
  const labels = value => value.replaceAll('${mostUnique}', '${itemLabel(mostUnique)}').replaceAll('${mostEmpathy}', '${itemLabel(mostEmpathy)}');
  for (const [from,to] of Object.entries(templates)) source = source.split(labels(from)).join(labels(to));
  // CSS font fallbacks and the Firestore write schema remain language-independent.
  source = source.split(/(<style>[\s\S]*?<\/style>|<script type="module"[^>]*>[\s\S]*?<\/script>)/g)
    .map(part => part.startsWith('<style>') || part.startsWith('<script type="module"') ? part : translate(part)).join('');
  source = source.replace('<html lang="ja">', '<html lang="en">');
  for (const target of pages) source = source.split(`${target}.html`).join(`${target}-en.html`);
  if (page === 'result') {
    source = source.replace("const sharedResult = new URL(location.href);", "const sharedResult = new URL(location.href);\n  sharedResult.searchParams.set('lang', 'en');");
    const colorNames = Object.fromEntries(['赤','橙','黄','黄緑','緑','青','水色','紫','ピンク','茶色','黒','グレー','白'].map(name => [name,copy[name]]));
    source = source.replace('votes[letter] = entries;', `votes[letter] = entries.map(entry => ({ ...entry, name: (${JSON.stringify(colorNames)})[entry.name] || entry.name }));`);
  }
  if (page === 'number' || page === 'subject') {
    source = source.replace('https://mo3ym.github.io/synestheshare/', 'https://synestheshare.pages.dev/index-en.html');
  }
  if (page === 'index') {
    source = source.replace('property="og:url" content="https://synestheshare.pages.dev/"', 'property="og:url" content="https://synestheshare.pages.dev/index-en.html"')
      .replaceAll('assets/ogp/home-ja-v1.png', 'assets/ogp/home-en-v1.png');
    source = source.replace('What colors are Japanese and math?', 'What colors are Japanese and math?<br>(For Japanese participants only)');
  }
  if (page === 'subject') {
    source = source.replace('params.get(LETTER_LABELS[digit])', "params.get(LETTER_LABELS[digit]) || (digit === 'language' ? params.get('Language') || params.get('国語') : null)");
  }
  fs.writeFileSync(path.join(root, `${page}-en.html`), source.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, ''));
}
console.log('Built English home, alphabet, result, number and subject pages.');
