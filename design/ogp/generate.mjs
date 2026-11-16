import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Design studies only. These files do not change the live OGP endpoint.
const dir = dirname(fileURLToPath(import.meta.url));
const ocean = readFileSync(resolve(dir, '../../assets/backgrounds/ocean.webp')).toString('base64');
const letters = 'ABCDEFGXYZ'.split('');
const colors = ['#4da8e8','#4da8e8','#8edfff','#8edfff','#67bf92','#9272ff','#8edfff','#fffdf9','#f5dc72','#4da8e8'];
const defs = `<defs>
  <linearGradient id="glass" x1="0" y1="0" x2=".75" y2="1"><stop stop-color="white" stop-opacity=".62"/><stop offset=".22" stop-color="white" stop-opacity=".32"/><stop offset=".42" stop-color="white" stop-opacity=".1"/><stop offset=".65" stop-color="white" stop-opacity="0"/></linearGradient>
  <linearGradient id="title"><stop stop-color="#b4f1ff"/><stop offset=".5" stop-color="#fffdf9"/><stop offset="1" stop-color="#e1cdff"/></linearGradient>
  <linearGradient id="veil" x2="1" y2="1"><stop stop-color="#081a32" stop-opacity=".88"/><stop offset="1" stop-color="#1b2045" stop-opacity=".5"/></linearGradient>
  <linearGradient id="paper" x2="1" y2="1"><stop stop-color="#fffdf9"/><stop offset="1" stop-color="#e9edf7"/></linearGradient>
  <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dy="5" stdDeviation="9" flood-color="#092f5a" flood-opacity=".14"/></filter>
</defs>`;
function text(x,y,value,size=24,fill='#fffdf9',extra='') {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${value}</text>`;
}
function dot(i,x,y,r=31) {
  return `<g filter="url(#shadow)"><circle cx="${x}" cy="${y}" r="${r}" fill="${colors[i]}"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#glass)"/><circle cx="${x}" cy="${y}" r="${r-.5}" fill="none" stroke="white" stroke-opacity=".24"/>${text(x,y+1,letters[i],r*.86,['#fffdf9','#8edfff','#f5dc72','#67bf92'].includes(colors[i])?'#2b2d38':'#fffdf9','font-family="Outfit,Arial,sans-serif" font-weight="700" text-anchor="middle" dominant-baseline="middle"')}</g>`;
}
const photo = `<image href="data:image/webp;base64,${ocean}" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/>`;
function footer(dark=true) {
  const color=dark?'#fffdf9':'#2b2d38';
  return `<path d="M64 551H1136" stroke="${color}" stroke-opacity=".18"/>${text(64,592,'SynestheShare',23,color,'font-family="Outfit,Arial,sans-serif" font-weight="600"')}${text(1136,591,'あなたのAは何色？',20,color,'text-anchor="end"')}`;
}
function svg(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><title>SynestheShare OGP design study — OCEAN TYPE</title>${defs}<g font-family="Noto Sans JP,Meiryo,sans-serif">${body}</g></svg>`;
}
const a=svg(`${photo}<rect width="1200" height="630" fill="url(#veil)"/>
  ${text(64,82,'MY SYNESTHESIA',17,'#d6e9f3','letter-spacing="4" font-family="Outfit,Arial,sans-serif"')}
  ${text(64,145,'私の文字は、海の色。',28)}
  ${text(58,258,'OCEAN TYPE',104,'url(#title)','font-family="Outfit,Arial,sans-serif" font-weight="700" letter-spacing="3"')}
  ${text(64,313,'静かな深さをたたえた、色彩の感覚。',23,'#d6e9f3')}
  <rect x="64" y="368" width="1072" height="125" rx="24" fill="white" fill-opacity=".09" stroke="white" stroke-opacity=".2"/>
  ${letters.map((_,i)=>dot(i,125+i*105.5,430,32)).join('')}${footer()}`);

const b=svg(`<rect width="1200" height="630" fill="url(#paper)"/>
  <path d="M870 0H1200V630H1070C990 450 1020 160 870 0Z" fill="#dce8f8" opacity=".65"/>
  ${text(64,80,'MY LETTERS, MY COLORS.',17,'#777f93','letter-spacing="3" font-family="Outfit,Arial,sans-serif"')}
  ${text(64,149,'私には、こんな色に見える。',40,'#2b2d38','font-weight="500"')}
  <rect x="906" y="91" width="230" height="50" rx="25" fill="#e2e6f6"/>
  ${text(1021,123,'OCEAN TYPE',20,'#52669a','font-family="Outfit,Arial,sans-serif" font-weight="700" text-anchor="middle" letter-spacing="1"')}
  ${letters.map((_,i)=>dot(i,177+(i%5)*211.5,270+Math.floor(i/5)*170,61)).join('')}${footer(false)}`);

const c=svg(`${photo}<rect width="1200" height="630" fill="url(#veil)"/>
  ${text(64,82,'HOW CLOSE ARE OUR COLORS?',17,'#d6e9f3','letter-spacing="3" font-family="Outfit,Arial,sans-serif"')}
  ${text(64,152,'私の色、みんなとどれくらい同じ？',34)}
  <rect x="64" y="198" width="420" height="299" rx="24" fill="white" fill-opacity=".1" stroke="white" stroke-opacity=".22"/>
  ${text(96,246,'世間との一致率',24,'#d6e9f3')}
  ${text(91,387,'40',142,'url(#title)','font-family="Outfit,Arial,sans-serif" font-weight="700"')}
  ${text(278,383,'%',62,'#d6e9f3','font-family="Outfit,Arial,sans-serif"')}
  ${text(96,459,'10文字中、4文字が多数派と一致',20,'#d6e9f3')}
  ${text(532,239,'あなたの色彩タイプ',20,'#d6e9f3')}
  ${text(529,303,'OCEAN TYPE',66,'url(#title)','font-family="Outfit,Arial,sans-serif" font-weight="700"')}
  ${letters.map((_,i)=>dot(i,570+(i%5)*124,365+Math.floor(i/5)*92,30)).join('')}${footer()}`);

const d=svg(`${photo}<rect width="1200" height="630" fill="url(#veil)"/>
  ${text(64,70,'SynestheShare',24,'#d6e9f3','font-family="Outfit,Arial,sans-serif" font-weight="600"')}
  ${text(64,151,'私の色、あなたと同じ？',48,'#fffdf9','font-weight="600"')}
  <rect x="64" y="194" width="420" height="304" rx="24" fill="white" fill-opacity=".1" stroke="white" stroke-opacity=".22"/>
  ${text(96,244,'世間との一致率',24,'#d6e9f3')}
  ${text(90,397,'40',154,'url(#title)','font-family="Outfit,Arial,sans-serif" font-weight="700"')}
  ${text(298,391,'%',64,'#d6e9f3','font-family="Outfit,Arial,sans-serif"')}
  ${text(96,463,'10文字中、4文字が多数派と一致',20,'#d6e9f3')}
  ${text(532,229,'私が選んだ、文字の色',22,'#d6e9f3')}
  ${letters.map((_,i)=>dot(i,570+(i%5)*124,293+Math.floor(i/5)*88,30)).join('')}
  ${text(532,471,'OCEAN TYPE',36,'url(#title)','font-family="Outfit,Arial,sans-serif" font-weight="700" letter-spacing="2"')}
  <path d="M64 530H1136" stroke="white" stroke-opacity=".2"/>
  ${text(64,585,'あなたのAは何色？',30,'#fffdf9','font-weight="500"')}
  <rect x="766" y="550" width="370" height="52" rx="26" fill="#fffdf9"/>
  ${text(951,584,'自分の色を調べてみる →',24,'#263d61','text-anchor="middle" font-weight="600"')}`);

const e=svg(`${photo}<rect width="1200" height="630" fill="#0b1934" fill-opacity=".82"/>
  ${text(64,120,'あなたのAは何色？',76,'#fffdf9','font-weight="700"')}
  ${text(64,219,'世間との一致率',46,'#fffdf9','font-weight="500"')}
  ${text(52,439,'40',248,'#fffdf9','font-family="Outfit,Arial,sans-serif" font-weight="700"')}
  ${text(354,433,'%',104,'#b4f1ff','font-family="Outfit,Arial,sans-serif" font-weight="700"')}
  <path d="M528 195V460" stroke="white" stroke-opacity=".22"/>
  ${text(610,219,'私の文字の色',46,'#fffdf9','font-weight="500"')}
  ${[0,5,8].map((i,j)=>dot(i,665+j*178,327,66)).join('')}
  ${text(842,456,'OCEAN TYPE',48,'#d9efff','font-family="Outfit,Arial,sans-serif" font-weight="700" text-anchor="middle" letter-spacing="2"')}
  <path d="M64 501H1136" stroke="white" stroke-opacity=".22"/>
  ${text(64,580,'あなたも診断してみる →',52,'#fffdf9','font-weight="700"')}
  ${text(1136,577,'SynestheShare',30,'#d6e9f3','font-family="Outfit,Arial,sans-serif" text-anchor="end"')}`);

const brand = readFileSync(resolve(dir, '../../images/logo.png')).toString('base64');
const singleLetter = svg(`
  <defs>
    <linearGradient id="stock" x2=".9" y2=".45">
      <stop stop-color="#fffdf9"/><stop offset=".54" stop-color="#faf8f3"/><stop offset="1" stop-color="#ebeff6"/>
    </linearGradient>
    <radialGradient id="letter-ink" cx=".3" cy=".22" r=".87">
      <stop stop-color="#e1f4ff"/><stop offset=".27" stop-color="#97d6f5"/>
      <stop offset=".65" stop-color="${colors[0]}"/><stop offset="1" stop-color="#417bc7"/>
    </radialGradient>
    <filter id="orb-shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#395c93" flood-opacity=".2"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#stock)"/>
  <g fill="none" stroke="#708cb1" opacity=".18">
    <circle cx="934" cy="316" r="252"/><circle cx="934" cy="316" r="278"/>
  </g>
  <image x="72" y="46" width="251" height="41" href="data:image/png;base64,${brand}"/>
  <g font-family="Noto Sans JP,Yu Gothic,Meiryo,sans-serif" fill="#192c41" font-weight="800">
    <text x="66" y="260" font-size="98">あなたのAは</text>
    <text x="62" y="430" font-size="162">何色？</text>
  </g>
  <g filter="url(#orb-shadow)">
    <circle cx="934" cy="316" r="219" fill="url(#letter-ink)"/>
    <circle cx="934" cy="316" r="218" fill="none" stroke="white" stroke-opacity=".55" stroke-width="2"/>
  </g>
  ${text(934,411,letters[0],268,'#183958','text-anchor="middle" font-family="Outfit,Arial,sans-serif" font-weight="700"')}
  <path d="M72 505H573" stroke="#b8c2c8" stroke-width="2"/>
  ${text(72,577,'多数派一致率',45,'#354b60','font-weight="600"')}
  ${text(366,579,'40%',64,'#192c41','font-family="Outfit,Arial,sans-serif" font-weight="700"')}
`);

// Each letter sits on the same current. The reflection below it uses its chosen color.
const tide = letters.map((letter, index) => {
  const x = 109 + index * 109;
  const y = 390 + 37 * Math.sin((x - 185) / 175);
  return { letter, color: colors[index], x, y };
});
const reflections = tide.map(({ color, x, y }) =>
  `<ellipse cx="${x}" cy="${y + 27}" rx="82" ry="33" fill="${color}"/>`
).join('');
const pearls = tide.map(({ letter, color, x, y }) => `
  <g transform="translate(${x} ${y})">
    <circle r="44" fill="${color}"/>
    <circle r="44" fill="url(#pearl)"/>
    <circle r="43.4" fill="none" stroke="#fffdf9" stroke-opacity=".52"/>
    ${text(0,15,letter,44,'#172f4b','text-anchor="middle" font-family="Outfit,Arial,sans-serif" font-weight="600"')}
  </g>`).join('');
const personalTide = svg(`
  <defs>
    <linearGradient id="depth" x1="0" y1=".1" x2=".95" y2=".8">
      <stop stop-color="#132248" stop-opacity=".86"/>
      <stop offset=".53" stop-color="#103954" stop-opacity=".68"/>
      <stop offset="1" stop-color="#39325f" stop-opacity=".48"/>
    </linearGradient>
    <radialGradient id="pearl" cx=".28" cy=".18" r=".92">
      <stop stop-color="white" stop-opacity=".65"/><stop offset=".52" stop-color="white" stop-opacity="0"/>
      <stop offset="1" stop-color="#173e71" stop-opacity=".23"/>
    </radialGradient>
    <linearGradient id="surf" x1="0" y1="0" x2=".83" y2="1">
      <stop stop-color="#a9ffe6" stop-opacity=".22"/><stop offset=".45" stop-color="#bdeeff" stop-opacity=".04"/>
      <stop offset="1" stop-color="#b3a5ff" stop-opacity=".26"/>
    </linearGradient>
    <filter id="bloom" x="-.2" y="-.8" width="1.4" height="2.6"><feGaussianBlur stdDeviation="24"/></filter>
  </defs>
  <rect width="1200" height="630" fill="#355476"/>
  ${photo}
  <rect width="1200" height="630" fill="url(#depth)"/>
  <path d="M-80 362 C150 279 279 469 517 446 S879 245 1280 370 V640 H-80Z" fill="url(#surf)"/>
  <path d="M-65 468 C209 549 311 457 555 396 S971 277 1260 410" fill="none" stroke="#b8eeff" stroke-opacity=".16" stroke-width="2"/>
  <g filter="url(#bloom)" opacity=".48">${reflections}</g>
  <path d="M-50 362 C155 274 275 463 516 446 S880 245 1260 365" fill="none" stroke="#d8ffff" stroke-opacity=".29" stroke-width="2"/>
  ${text(600,139,'私の文字の色',44,'#e6f4ff','text-anchor="middle" font-weight="500" letter-spacing="3"')}
  ${text(600,270,'OCEAN TYPE',126,'url(#title)','text-anchor="middle" font-family="Outfit,Arial,sans-serif" font-weight="700" letter-spacing="5"')}
  ${pearls}
  ${text(600,565,'SynestheShare',32,'#e6efff','text-anchor="middle" font-family="Outfit,Arial,sans-serif" font-weight="600"')}
`);

const resultCard = svg(`
  <defs>
    <linearGradient id="result-depth" x2="1" y2="1">
      <stop stop-color="#0b1c38" stop-opacity=".82"/>
      <stop offset=".6" stop-color="#14354e" stop-opacity=".62"/>
      <stop offset="1" stop-color="#30234e" stop-opacity=".58"/>
    </linearGradient>
    <linearGradient id="result-panel" x2=".8" y2="1">
      <stop stop-color="white" stop-opacity=".13"/>
      <stop offset="1" stop-color="white" stop-opacity=".04"/>
    </linearGradient>
  </defs>
  ${photo}
  <rect width="1200" height="630" fill="url(#result-depth)"/>
  <rect x="64" y="133" width="410" height="348" rx="30" fill="url(#result-panel)" stroke="white" stroke-opacity=".23"/>
  ${text(269,211,'世間との一致率',44,'#f1f7ff','text-anchor="middle" font-weight="500"')}
  ${text(100,417,'40',218,'url(#title)','font-family="Outfit,Arial,sans-serif" font-weight="700"')}
  ${text(348,409,'%',83,'#dffcff','font-family="Outfit,Arial,sans-serif" font-weight="600"')}
  ${text(832,213,'OCEAN TYPE',76,'url(#title)','text-anchor="middle" font-family="Outfit,Arial,sans-serif" font-weight="700" letter-spacing="2"')}
  ${letters.map((_,i)=>dot(i,580+(i%5)*126,313+Math.floor(i/5)*115,43)).join('')}
  ${text(600,568,'SynestheShare',32,'#e3ecf9','text-anchor="middle" font-family="Outfit,Arial,sans-serif" font-weight="600"')}
`);

for (const [name,body] of [['01-atmosphere',a],['02-palette',b],['03-result',c],['04-social',d],['05-mobile',e],['06-one-question',singleLetter],['07-my-colors',personalTide],['08-result-card',resultCard]]) {
  writeFileSync(resolve(dir,`${name}.svg`),body);
}
writeFileSync(resolve(dir,'index.html'),`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SynestheShare — OGPデザイン比較</title><style>
*{box-sizing:border-box}body{margin:0;background:#f0f0ec;color:#2b2d38;font-family:Meiryo,sans-serif;padding:48px 24px}main{max-width:1100px;margin:auto}h1{font-size:28px;font-weight:500}p{line-height:1.9;color:#636575}header{margin-bottom:48px}.study{margin:0 0 56px}.label{display:flex;align-items:center;gap:14px;margin-bottom:12px}.number{font:20px Arial;color:#858698}h2{font-size:20px;margin:0;font-weight:500}.study img{display:block;width:100%;box-shadow:0 16px 48px #27345715;border-radius:8px}.study p{font-size:14px}a{color:#52669a}.small{max-width:600px;margin-top:22px}.small img{border-radius:4px}.small summary{cursor:pointer;color:#777f93;font-size:13px;margin-bottom:12px}</style><main>
<header><p>SynestheShare / DESIGN STUDIES</p><h1>共有したくなる、あなたの色。</h1><p>同じ10文字の回答を、3つの方向でデザイン。すべて1200 × 630の比較用モックです。<br>OCEAN TYPE / 回答コード：5566476C25。一致率40%は既存のダミー統計で計算した参考値です。<br>本番のOGP生成・共有機能にはまだ反映していません。</p></header>
${[
 ['08','案③をベースにした結果カード','08-result-card','タイプ別の背景に、一致率・タイプ名・10文字の配色を配置。数値はサンプル回答とダミー統計による参考値です。'],
 ['07','私の文字の色','07-my-colors','OCEAN TYPEの海に、回答した10文字をひと続きの波として浮かべた結果カード。'],
 ['06','あなたのAは何色？','06-one-question','投稿者が選んだAの色を、大きなひとつの円で見せます。一致率は全回答の結果です。'],
 ['05','スマホ優先：読める情報に絞る','05-mobile','見出し・一致率・診断への誘いを大きく。文字の色は3つだけ抜粋し、細かい説明とボタン風の装飾を省きました。360px幅では見出し約23px、一致率の数値約74px、誘導文約16pxになります。'],
 ['04','③の改良案：自分も試したくなる結果カード','04-social','SNSでの拡散を目指す案。問いかけ、一致率、自分のパレット、診断への誘いの順で構成。OGP画像全体をクリックして共有結果へ進み、結果ページの「自分も診断する」から新しい回答を始める想定です。画像内の誘導は独立したボタンではありません。'],
 ['01','世界観を届ける','01-atmosphere','既存の海の背景を深い色に重ね、大きなタイプ名を主役に。文字のパレットで、その人だけの結果も伝えます。おすすめの方向です。'],
 ['02','私のパレットを見せる','02-palette','明るい余白に、大きなガラスの色円。文字と色の組み合わせが最も読みやすく、ほかの人と見比べたくなる方向です。'],
 ['03','みんなとの違いを伝える','03-result','一致率を大きく見せ、比較したくなるきっかけをつくる方向。数値は参考表示で、実装時には統計の取得状態を考慮します。']
].map(([n,title,file,desc])=>`<section class="study"><div class="label"><span class="number">${n}</span><h2>${title}</h2></div><img src="${file}.svg" alt="${title}のOGP案"><p>${desc} <a href="${file}.svg" target="_blank">原寸で開く ↗</a></p><details class="small"><summary>タイムライン程度の幅で確認（最大600px）</summary><img src="${file}.svg" alt="縮小プレビュー"></details></section>`).join('')}
</main></html>`);
writeFileSync(resolve(dir,'mobile.html'),`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OGP スマホ幅比較</title><style>*{box-sizing:border-box}body{margin:0;padding:24px 12px;background:#f0f0ec;color:#2b2d38;font-family:Meiryo,sans-serif}main{max-width:760px;margin:auto}h1{font-size:22px}p{font-size:14px;line-height:1.8}figure{margin:28px 0}figcaption{font-size:14px;margin-bottom:10px}img{display:block;width:360px;max-width:100%;height:auto;border-radius:8px}a{color:#52669a}</style><main><h1>スマホで読めるかを比較</h1><p>画像幅360pxで表示しています。画面が狭い場合はさらに縮小します。<br>実際のSNS画面の再現ではなく、同じ幅での視認性比較です。数値は参考値です。</p><figure><figcaption>案③をベースにした結果カード</figcaption><img src="08-result-card.png" alt="世間との一致率40%、OCEAN TYPEと10文字の配色を示す結果カード"></figure><figure><figcaption>私の文字の色</figcaption><img src="07-my-colors.svg" alt="海に10文字の色が浮かぶOCEAN TYPEの結果カード"></figure><figure><figcaption>前案　あなたのAは何色？</figcaption><img src="06-one-question.svg" alt="青いAの円と、多数派一致率40%を示す結果カード"></figure><figure><figcaption>前案　文字の色を3つ掲載</figcaption><img src="05-mobile.svg" alt="スマホ優先のOGP案"></figure><figure><figcaption>前の案：説明と全10文字を掲載</figcaption><img src="04-social.svg" alt="前のOGP案"></figure><p><a href="index.html">すべての案を見る</a></p></main></html>`);
console.log('Created 8 SVG studies, index.html and mobile.html');
