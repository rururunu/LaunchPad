export interface PageCard { key: string; cols: number; rows: number; placement?: { page: number; col: number; row: number; columns: number } }
export function paginateCards(cards: PageCard[], columns: number, maxRows = 7) {
  const positions = new Map<string, { page: number; col: number; row: number; cols: number; rows: number }>();
  let page = 0;
  const pages = new Map<number, boolean[][]>();
  const pageCells = (index: number) => {
    if (!pages.has(index)) pages.set(index, Array.from({ length: maxRows }, () => Array<boolean>(columns).fill(false)));
    return pages.get(index)!;
  };
  for (const card of cards) {
    const p = card.placement;
    const cols = Math.max(1, Math.min(columns, Math.round(card.cols)));
    const rows = Math.max(1, Math.min(maxRows, Math.round(card.rows)));
    if (!p || p.columns !== columns || ![p.page, p.col, p.row].every(Number.isInteger) || p.page < 0 || p.page >= cards.length || p.col < 1 || p.row < 1 || p.col + cols - 1 > columns || p.row + rows - 1 > maxRows) continue;
    const grid = pageCells(p.page);
    if (!grid.slice(p.row - 1, p.row - 1 + rows).every(line => line.slice(p.col - 1, p.col - 1 + cols).every(v => !v))) continue;
    for (let r = p.row - 1; r < p.row - 1 + rows; r++) for (let c = p.col - 1; c < p.col - 1 + cols; c++) grid[r][c] = true;
    positions.set(card.key, { page: p.page, row: p.row, col: p.col, cols, rows });
  }
  let cells = Array.from({ length: maxRows }, () => Array<boolean>(columns).fill(false));
  cells = pageCells(0);
  for (const card of cards) {
    if (positions.has(card.key)) continue;
    const cols = Math.max(1, Math.min(columns, Math.round(card.cols)));
    const rows = Math.max(1, Math.min(maxRows, Math.round(card.rows)));
    const find = () => {
      for (let row = 0; row <= maxRows - rows; row++) for (let col = 0; col <= columns - cols; col++) {
        if (cells.slice(row, row + rows).every(line => line.slice(col, col + cols).every(value => !value))) return { row, col };
      }
      return null;
    };
    let slot = find();
    while (!slot) { page++; cells = pageCells(page); slot = find(); }
    for (let r = slot.row; r < slot.row + rows; r++) for (let c = slot.col; c < slot.col + cols; c++) cells[r][c] = true;
    positions.set(card.key, { page, row: slot.row + 1, col: slot.col + 1, cols, rows });
  }
  // Offset in half-column units, so odd empty-column counts also center exactly.
  const usedColumns = new Map<number, number>();
  for (const cell of positions.values()) {
    usedColumns.set(cell.page, Math.max(usedColumns.get(cell.page) ?? 0, cell.col + cell.cols - 1));
  }
  const columnOffsets = new Map([...usedColumns].map(([page, used]) => [page, columns - used]));
  return { positions, columnOffsets, count: Math.max(1, ...[...positions.values()].map(cell => cell.page + 1)) };
}
