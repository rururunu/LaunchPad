import { expect, it, vi } from 'vitest';
vi.mock('./storage', () => ({ isChromeStorageAvailable: () => false, storage: {} }));
import { parseEntry } from './iconCache';
it('reads the same icon from Chrome object storage and serialized browser storage', () => {
  const entry = { dataUrl: 'data:image/png;base64,abc', fetchedAt: 123456 };
  expect(parseEntry(entry)).toEqual(entry);
  expect(parseEntry(JSON.stringify(entry))).toEqual(entry);
});
it('rejects corrupted legacy cache and accepts old image data', () => {
  expect(parseEntry('[object Object]')).toBeNull();
  expect(parseEntry('data:image/png;base64,abc')?.fetchedAt).toBe(0);
});
