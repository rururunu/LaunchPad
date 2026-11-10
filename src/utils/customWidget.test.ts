import { expect, it } from 'vitest';
import { isValidCustomWidget } from './customWidget';
const widget = { type: 'custom', title: '计数', code: '<button>0</button>', minCols: 1, maxCols: 4, minRows: 1, maxRows: 3 };
it('accepts portable widget code and limits', () => { expect(isValidCustomWidget(JSON.parse(JSON.stringify(widget)))).toBe(true); });
it('rejects invalid or unbounded imported limits and code', () => {
  for (const bad of [{ maxCols: Infinity }, { maxRows: 100 }, { minCols: 5 }, { minRows: 1.5 }, { code: 42 }, { popupCode: {} }]) expect(isValidCustomWidget({ ...widget, ...bad })).toBe(false);
});
