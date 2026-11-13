export function normalizeDateFontSize(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(10, Math.min(40, Math.round(value)))
    : 14
}
