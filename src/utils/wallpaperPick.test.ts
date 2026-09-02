import { describe, expect, it } from 'vitest';
import { buildExcludeKeySet, pickRandomExcluding } from '@/utils/wallpaperPick';

describe('pickRandomExcluding', () => {
  it('prefers items not in exclude set', () => {
    const items = ['a', 'b', 'c'];
    const picked = pickRandomExcluding(items, new Set(['a', 'b']), (item) => item);
    expect(picked).toBe('c');
  });

  it('falls back to full pool when all items are excluded', () => {
    const items = [{ id: 'x' }, { id: 'y' }];
    const picked = pickRandomExcluding(items, new Set(['x', 'y']), (item) => item.id);
    expect(items).toContain(picked);
  });
});

describe('buildExcludeKeySet', () => {
  it('drops empty urls', () => {
    expect(buildExcludeKeySet(['https://a.test/1', '', 'https://a.test/2']).size).toBe(2);
  });
});
