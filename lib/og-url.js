export function ogImageUrl(pageUrl) {
  const page = new URL(pageUrl);
  const image = new URL('/api/og', page);
  for (const key of ['r', 'mode', 'score', 'stat']) {
    const value = page.searchParams.get(key);
    if (value !== null) image.searchParams.set(key, value);
  }
  image.searchParams.set('v', '2');
  return image.href;
}
