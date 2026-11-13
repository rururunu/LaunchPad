import { expect, it } from 'vitest';
import { paginateCards } from './cardPages';
it('centers sparse pages including odd empty-column counts', () => {
  const cards = Array.from({ length: 4 }, (_, i) => ({ key: String(i), cols: 1, rows: 1 }));
  expect(paginateCards(cards, 12).columnOffsets.get(0)).toBe(8);
  expect(paginateCards(cards.slice(0, 3), 12).columnOffsets.get(0)).toBe(9);
  expect(paginateCards(cards, 4).columnOffsets.get(0)).toBe(0);
  const mixed = paginateCards([{ key: 'wide', cols: 4, rows: 2 }, { key: 'small', cols: 1, rows: 1 }], 12);
  expect(mixed.columnOffsets.get(0)).toBe(7);
});
it('moves the 85th single cell card to page two on a 12 by 7 grid', () => {
  const result = paginateCards(Array.from({ length: 85 }, (_, i) => ({ key: String(i), cols: 1, rows: 1 })), 12);
  expect(result.count).toBe(2);
  expect(result.positions.get('84')).toMatchObject({ page: 1, row: 1, col: 1 });
});
it('keeps mixed sizes inside page bounds without overlaps at all breakpoints', () => {
  for (const columns of [4, 6, 12]) {
    const result = paginateCards(Array.from({ length: 70 }, (_, i) => ({ key: String(i), cols: i % 4 + 1, rows: i % 3 + 1 })), columns);
    const occupied = new Set();
    for (const cell of result.positions.values()) {
      expect(cell.row + cell.rows - 1).toBeLessThanOrEqual(7);
      expect(cell.col + cell.cols - 1).toBeLessThanOrEqual(columns);
      for (let r = cell.row; r < cell.row + cell.rows; r++) for (let c = cell.col; c < cell.col + cell.cols; c++) {
        const key = `${cell.page}:${r}:${c}`;
        expect(occupied.has(key)).toBe(false); occupied.add(key);
      }
    }
  }
});

it('keeps Gemini in the empty cell below Claude after layout is restored', () => {
  const cards = [
    { key: 'claude', cols: 2, rows: 1, placement: { page: 0, col: 3, row: 1, columns: 12 } },
    { key: 'tall', cols: 2, rows: 2, placement: { page: 0, col: 5, row: 1, columns: 12 } },
    { key: 'gemini', cols: 2, rows: 1, placement: { page: 0, col: 3, row: 2, columns: 12 } },
  ];
  const result = paginateCards(JSON.parse(JSON.stringify(cards)), 12);
  expect(result.positions.get('gemini')).toMatchObject({ page: 0, col: 3, row: 2 });
  expect(result.positions.get('claude')).toMatchObject({ col: 3, row: 1 });
  expect(result.positions.get('tall')).toMatchObject({ col: 5, row: 1 });
});
it('reserves explicit destinations before placing displaced cards', () => {
  const result = paginateCards([
    { key: 'displaced', cols: 2, rows: 1 },
    { key: 'dragged', cols: 2, rows: 1, placement: { page: 0, col: 1, row: 1, columns: 12 } },
  ], 12);
  expect(result.positions.get('dragged')).toMatchObject({ col: 1, row: 1 });
  expect(result.positions.get('displaced')).toMatchObject({ col: 3, row: 1 });
});
it('falls back to automatic packing for incompatible screen widths or overlapping placements', () => {
  const cards = ['a', 'b'].map(key => ({ key, cols: 2, rows: 1, placement: { page: 0, col: 11, row: 1, columns: 12 } }));
  expect(paginateCards(cards, 4).positions.get('a')).toMatchObject({ col: 1, row: 1 });
  expect(paginateCards(cards, 4).positions.get('b')).toMatchObject({ col: 3, row: 1 });
  expect(paginateCards(cards, 12).positions.get('b')).toMatchObject({ col: 1, row: 1 });
});
