/** 从列表中随机选取，优先排除最近已展示过的项 */
export function pickRandomExcluding<T>(
  items: T[],
  excludeKeys: ReadonlySet<string>,
  getKey: (item: T) => string,
): T {
  if (items.length === 0) {
    throw new Error('empty wallpaper pool');
  }

  const filtered = excludeKeys.size
    ? items.filter((item) => !excludeKeys.has(getKey(item)))
    : items;
  const pool = filtered.length > 0 ? filtered : items;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function buildExcludeKeySet(urls: string[] | undefined): Set<string> {
  return new Set((urls ?? []).filter(Boolean));
}
