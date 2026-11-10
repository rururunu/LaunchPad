export interface IconCandidate { url: string; label: string }
export function defaultIconCandidates(pageUrl: string): IconCandidate[] {
  const page = new URL(pageUrl);
  if (!['http:', 'https:'].includes(page.protocol)) return [];
  return [
    { url: new URL('/apple-touch-icon.png', page).href, label: '网站 Touch 图标' },
    { url: new URL('/favicon.svg', page).href, label: '网站 SVG' },
    { url: new URL('/icon.svg', page).href, label: '网站矢量图标' },
    { url: new URL('/favicon.ico', page).href, label: '网站默认图标' },
    { url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(page.hostname)}&sz=256`, label: 'Google 图标服务 · 256' },
    { url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(page.hostname)}&sz=128`, label: 'Google 图标服务 · 128' },
  ];
}
export function parsePageIcons(html: string, pageUrl: string): IconCandidate[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const base = doc.querySelector('base[href]')?.getAttribute('href');
  let baseUrl = pageUrl;
  try { if (base) baseUrl = new URL(base, pageUrl).href; } catch { /* Keep page URL. */ }
  return Array.from(doc.querySelectorAll('link[rel][href]')).flatMap(link => {
    if (!/(^|\s)(icon|apple-touch-icon|apple-touch-icon-precomposed)(\s|$)/i.test(link.getAttribute('rel') ?? '')) return [];
    try {
      const url = new URL(link.getAttribute('href')!, baseUrl);
      return ['https:', 'http:'].includes(url.protocol) ? [{ url: url.href, label: `网站声明图标 ${link.getAttribute('sizes') ?? ''}`.trim() }] : [];
    } catch { return []; }
  });
}
