/**
 * functions/_middleware.js
 * result.html の OGP meta タグをサーバー側で書き換える
 *
 * Twitter/X などのクローラーは JS を実行しないため、
 * 静的 HTML に埋め込まれた og:image (content="") をそのまま見てしまう。
 * このミドルウェアが URL パラメータから正しい og:image URL を構築し、
 * HTMLRewriter で meta タグを上書きしてクローラーに返す。
 */

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // result.html 以外はそのままパス
  const path = url.pathname;
  if (!path.endsWith('/result.html') && !path.endsWith('/result')) {
    return next();
  }

  // r パラメータがなければ書き換え不要
  const r    = url.searchParams.get('r');
  const mode = url.searchParams.get('mode') || '10';
  if (!r) return next();

  // OGP 画像 URL（og.js エンドポイント）
  const ogImageUrl = `${url.origin}/api/og?r=${encodeURIComponent(r)}&mode=${mode}`;
  const pageUrl    = url.href;

  // 静的ファイルを取得
  const response = await next();
  if (!response.ok) return response;

  // HTMLRewriter で meta タグを書き換え
  return new HTMLRewriter()
    .on('meta[property="og:image"]',       { element: el => el.setAttribute('content', ogImageUrl) })
    .on('meta[property="og:url"]',         { element: el => el.setAttribute('content', pageUrl)    })
    .on('meta[name="twitter:image"]',      { element: el => el.setAttribute('content', ogImageUrl) })
    .on('meta[name="twitter:card"]',       { element: el => el.setAttribute('content', 'summary_large_image') })
    .transform(response);
}
