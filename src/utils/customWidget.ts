export function isValidCustomWidget(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const w = value as Record<string, unknown>;
  if (w.type !== 'custom') return true;
  if (typeof w.title !== 'string' || !w.title.trim() || w.title.length > 60 || typeof w.code !== 'string' || !w.code.trim()) return false;
  if (w.popupCode !== undefined && typeof w.popupCode !== 'string') return false;
  if (w.code.length + String(w.popupCode ?? '').length > 200000) return false;
  for (const key of ['minCols', 'maxCols', 'minRows', 'maxRows']) {
    const n = w[key];
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > (key.endsWith('Cols') ? 12 : 6)) return false;
  }
  return Number(w.minCols) <= Number(w.maxCols) && Number(w.minRows) <= Number(w.maxRows);
}
