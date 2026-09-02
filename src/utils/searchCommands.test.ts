import { describe, expect, it } from 'vitest';
import { parseSlashCommand, isSlashCommand } from './searchCommands';

describe('parseSlashCommand', () => {
  it('parses /new', () => {
    expect(parseSlashCommand('/new')).toEqual({ type: 'new' });
  });

  it('parses /t1 as tab index', () => {
    expect(parseSlashCommand('/t1')).toEqual({ type: 'tab-index', index: 1 });
    expect(parseSlashCommand('/t12')).toEqual({ type: 'tab-index', index: 12 });
  });

  it('parses /t query as tab search', () => {
    expect(parseSlashCommand('/t deep')).toEqual({ type: 'tab-search', query: 'deep' });
    expect(parseSlashCommand('/t')).toEqual({ type: 'tab-search', query: '' });
  });

  it('returns null for unknown slash commands', () => {
    expect(parseSlashCommand('/foo')).toBeNull();
    expect(parseSlashCommand('bd test')).toBeNull();
  });

  it('isSlashCommand detects known commands only', () => {
    expect(isSlashCommand('/new')).toBe(true);
    expect(isSlashCommand('/t3')).toBe(true);
    expect(isSlashCommand('/unknown')).toBe(false);
  });
});
