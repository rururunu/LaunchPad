export const CLOCK_FONT_GROUPS = ['system', 'sans', 'display', 'serif', 'script', 'mono'] as const

export type ClockFontGroup = (typeof CLOCK_FONT_GROUPS)[number]

export interface ClockFontOption {
  id: string
  group: ClockFontGroup
  labelKey?: string
  /** Google Fonts family. Omitted for generic system faces. */
  google?: string
  /** CSS2 weight list. Defaults to 400–700. */
  weights?: string
}

const FULL_WEIGHTS = '400;500;600;700'

export const CLOCK_FONTS: readonly ClockFontOption[] = [
  { id: 'system-ui', group: 'system', labelKey: 'basic.fontSystem' },
  { id: 'ui-rounded', group: 'system', labelKey: 'basic.fontRounded' },
  { id: 'ui-serif', group: 'system', labelKey: 'basic.fontSystemSerif' },
  { id: 'ui-monospace', group: 'system', labelKey: 'basic.fontSystemMono' },

  { id: 'Inter', group: 'sans', google: 'Inter' },
  { id: 'Space Grotesk', group: 'sans', google: 'Space Grotesk' },
  { id: 'Josefin Sans', group: 'sans', google: 'Josefin Sans' },
  { id: 'Comfortaa', group: 'sans', google: 'Comfortaa' },

  { id: 'Syne', group: 'display', google: 'Syne' },
  { id: 'Oswald', group: 'display', google: 'Oswald' },
  { id: 'Bebas Neue', group: 'display', google: 'Bebas Neue', weights: '400' },
  { id: 'Orbitron', group: 'display', google: 'Orbitron' },

  { id: 'Bodoni Moda', group: 'serif', google: 'Bodoni Moda' },
  { id: 'Fraunces', group: 'serif', google: 'Fraunces' },
  { id: 'Cinzel', group: 'serif', google: 'Cinzel' },

  { id: 'Pacifico', group: 'script', google: 'Pacifico', weights: '400' },

  { id: 'Space Mono', group: 'mono', google: 'Space Mono', weights: '400;700' },
]

const GENERIC_FAMILIES = new Set(['system-ui', 'ui-rounded', 'ui-serif', 'ui-monospace', 'ui-sans-serif'])

/** CSS font-family for a stored clock face. Generic families stay unquoted. */
export function clockFontFamily(id: string): string {
  if (GENERIC_FAMILIES.has(id)) return id
  const font = CLOCK_FONTS.find((item) => item.id === id)
  const fallback = font?.group === 'serif'
    ? 'ui-serif'
    : font?.group === 'mono'
      ? 'ui-monospace'
      : font?.group === 'script'
        ? 'cursive'
        : 'sans-serif'
  return `'${id.replace(/'/g, '')}', ${fallback}`
}

/** Faces already linked from index.html, so the new tab does not request them again. */
const PRELOADED = new Set(['Inter', 'Plus Jakarta Sans', 'Outfit', 'Poppins', 'Nunito', 'Montserrat'])
const loaded = new Set<string>(PRELOADED)

function stylesheetHref(fonts: readonly ClockFontOption[]): string {
  const params = fonts
    .filter((font) => font.google)
    .map((font) => {
      const family = (font.google ?? font.id).replace(/ /g, '+')
      return `family=${family}:wght@${font.weights ?? FULL_WEIGHTS}`
    })
    .join('&')
  return `https://fonts.googleapis.com/css2?${params}&display=swap`
}

function appendStylesheet(fonts: readonly ClockFontOption[]) {
  if (typeof document === 'undefined' || fonts.length === 0) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = stylesheetHref(fonts)
  document.head.appendChild(link)
}

export function ensureClockFont(id: string) {
  if (id) void warmClockFonts([id])
  if (!id || GENERIC_FAMILIES.has(id) || loaded.has(id)) return
  const font = CLOCK_FONTS.find((item) => item.id === id)
  if (font && !font.google) return
  loaded.add(id)
  appendStylesheet([font ?? { id, group: 'sans', google: id }])
}

/** Load every downloadable face so the font menu can draw each name in its own type. */
export function ensureClockFontCatalog() {
  const pending = CLOCK_FONTS.filter((font) => font.google && !loaded.has(font.id))
  if (pending.length === 0) return
  pending.forEach((font) => loaded.add(font.id))
  const size = 8
  for (let index = 0; index < pending.length; index += size) {
    appendStylesheet(pending.slice(index, index + size))
  }
}

// Persist the chosen faces (including their font bytes), not the entire font catalog.
const fontTasks = new Map<string, Promise<void>>()
async function cacheFont(id: string): Promise<void> {
  if (GENERIC_FAMILIES.has(id)) return
  if (fontTasks.has(id)) return fontTasks.get(id)!
  const task = (async () => {
    const font = CLOCK_FONTS.find(item => item.id === id) ?? { id, google: id, group: 'sans' as const }
    const cache = await caches.open('launchpad-fonts-v1')
    async function cachedResponse(url: string): Promise<Response> {
      const hit = await cache.match(url)
      if (hit) return hit
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!response.ok) throw new Error('Font download failed')
      await cache.put(url, response.clone())
      return response
    }
    const css = await (await cachedResponse(stylesheetHref([font]))).text()
    const blocks = css.match(/@font-face\s*\{[^}]+\}/g) ?? []
    await Promise.all(blocks.map(async block => {
      const url = block.match(/url\((?:["']?)(https:[^)"']+)["']?\)/)?.[1]
      if (!url) return
      const bytes = await (await cachedResponse(url)).arrayBuffer()
      const face = new FontFace(id, bytes, {
        weight: block.match(/font-weight:\s*([^;]+)/)?.[1]?.trim() ?? '400',
        style: block.match(/font-style:\s*([^;]+)/)?.[1]?.trim() ?? 'normal',
        unicodeRange: block.match(/unicode-range:\s*([^;]+)/)?.[1]?.trim() ?? 'U+0-10FFFF',
      })
      await face.load()
      document.fonts.add(face)
    }))
  })().catch(() => { fontTasks.delete(id) })
  fontTasks.set(id, task)
  return task
}

export async function warmClockFonts(ids: string[]): Promise<void> {
  if (typeof caches === 'undefined' || typeof FontFace === 'undefined') return
  await Promise.all([...new Set(ids)].map(cacheFont))
}
