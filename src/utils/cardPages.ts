export interface PageCard { key: string; cols: number; rows: number }
export function paginateCards(cards: PageCard[], columns: number, maxRows = 7) {
  const positions = new Map<string, { page: number; col: number; row: number; cols: number; rows: number }>();
  let page = 0;
  let cells = Array.from({ length: maxRows }, () => Array<boolean>(columns).fill(false));
  for (const card of cards) {
    const cols = Math.max(1, Math.min(columns, Math.round(card.cols)));
    const rows = Math.max(1, Math.min(maxRows, Math.round(card.rows)));
    const find = () => {
      for (let row = 0; row <= maxRows - rows; row++) for (let col = 0; col <= columns - cols; col++) {
        if (cells.slice(row, row + rows).every(line => line.slice(col, col + cols).every(value => !value))) return { row, col };
      }
      return null;
    };
    let slot = find();
    if (!slot) { page++; cells = Array.from({ length: maxRows }, () => Array<boolean>(columns).fill(false)); slot = find()!; }
    for (let r = slot.row; r < slot.row + rows; r++) for (let c = slot.col; c < slot.col + cols; c++) cells[r][c] = true;
    positions.set(card.key, { page, row: slot.row + 1, col: slot.col + 1, cols, rows });
  }
  // Offset in half-column units, so odd empty-column counts also center exactly.
  const usedColumns = new Map<number, number>();
  for (const cell of positions.values()) {
    usedColumns.set(cell.page, Math.max(usedColumns.get(cell.page) ?? 0, cell.col + cell.cols - 1));
  }
  const columnOffsets = new Map([...usedColumns].map(([page, used]) => [page, columns - used]));
  return { positions, columnOffsets, count: cards.length ? page + 1 : 1 };
}
