export function ogImageUrl(pageUrl) {
  const page = new URL(pageUrl);
  const image = new URL('/api/og', page);
  for (const key of ['r', 'mode', 'majority', 'score', 'stat', 'lang']) {
    const value = page.searchParams.get(key);
    if (value !== null) image.searchParams.set(key, value);
  }
  if (/\/result-en(?:\.html)?$/.test(page.pathname)) image.searchParams.set('lang', 'en');
  image.searchParams.set('v', '20');
  return image.href;
}
