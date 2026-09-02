import { describe, expect, it } from 'vitest';
import {
  migrateInjectJumpUrl,
  migrateJumpDataEngines,
  serializeJumpEngines,
} from '@/utils/jumpDataMigration';
import { INJECT_PROMPT_QUERY_KEY, buildSearchUrl } from '@/utils/searchEngines';

describe('migrateInjectJumpUrl', () => {
  it('migrates injectPrompt engines from q to _lp_q', () => {
    expect(
      migrateInjectJumpUrl('https://www.kimi.com/?q=&<query>', true),
    ).toBe(`https://www.kimi.com/?${INJECT_PROMPT_QUERY_KEY}=&<query>`);
  });

  it('migrates injectPrompt engines from p to _lp_q', () => {
    expect(
      migrateInjectJumpUrl('https://example.com/chat?p=&<query>', true),
    ).toBe(`https://example.com/chat?${INJECT_PROMPT_QUERY_KEY}=&<query>`);
  });

  it('migrates ampersand-prefixed legacy params', () => {
    expect(
      migrateInjectJumpUrl('https://example.com/app?foo=1&q=&<query>', true),
    ).toBe(`https://example.com/app?foo=1&${INJECT_PROMPT_QUERY_KEY}=&<query>`);
  });

  it('does not migrate normal search engines without injectPrompt', () => {
    const google = 'https://www.google.com/search?q=&<query>';
    expect(migrateInjectJumpUrl(google, false)).toBe(google);
    expect(migrateInjectJumpUrl(google)).toBe(google);
  });

  it('is idempotent when already migrated', () => {
    const migrated = `https://chatgpt.com/?${INJECT_PROMPT_QUERY_KEY}=&<query>`;
    expect(migrateInjectJumpUrl(migrated, true)).toBe(migrated);
  });
});

describe('migrateJumpDataEngines', () => {
  it('migrates only injectPrompt items in a mixed list', () => {
    const { engines, changed } = migrateJumpDataEngines([
      {
        key: ['gg'],
        label: 'Google',
        jumpUrl: 'https://www.google.com/search?q=&<query>',
        injectPrompt: false,
      },
      {
        key: ['kf'],
        label: 'Kimi',
        jumpUrl: 'https://www.kimi.com/?q=&<query>',
        injectPrompt: true,
      },
    ]);

    expect(changed).toBe(true);
    expect(engines[0].jumpUrl).toContain('q=&<query>');
    expect(engines[1].jumpUrl).toContain(`${INJECT_PROMPT_QUERY_KEY}=&<query>`);
  });
});

describe('serializeJumpEngines', () => {
  it('keeps injectPrompt flag in storage payload', () => {
    const json = serializeJumpEngines([
      {
        key: ['ds'],
        label: 'DeepSeek',
        jumpUrl: `https://chat.deepseek.com/?${INJECT_PROMPT_QUERY_KEY}=&<query>`,
        injectPrompt: true,
      },
    ]);
    expect(JSON.parse(json)[0].injectPrompt).toBe(true);
  });
});

describe('buildSearchUrl integration', () => {
  it('builds migrated kimi url with encoded query', () => {
    const template = `https://www.kimi.com/?${INJECT_PROMPT_QUERY_KEY}=&<query>`;
    expect(buildSearchUrl(template, '你好')).toBe(
      `https://www.kimi.com/?${INJECT_PROMPT_QUERY_KEY}=%E4%BD%A0%E5%A5%BD`,
    );
  });
});
