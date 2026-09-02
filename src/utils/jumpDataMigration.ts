import { INJECT_PROMPT_QUERY_KEY } from '@/utils/searchEngines';

const LEGACY_INJECT_QUERY_RE = /[?&](q|p)=&<query>/i;

export interface JumpEngineLike {
  key?: string[];
  label?: string;
  jumpUrl: string;
  iconUrl?: string;
  injectPrompt?: boolean;
}

/** 将 injectPrompt 引擎的旧占位参数 q/p 迁移为扩展专用 _lp_q */
export function migrateInjectJumpUrl(jumpUrl: string, injectPrompt?: boolean): string {
  if (!jumpUrl || injectPrompt !== true) return jumpUrl;
  if (!LEGACY_INJECT_QUERY_RE.test(jumpUrl)) return jumpUrl;
  if (jumpUrl.includes(`${INJECT_PROMPT_QUERY_KEY}=&<query>`)) return jumpUrl;

  return jumpUrl.replace(/([?&])(q|p)=&<query>/gi, `$1${INJECT_PROMPT_QUERY_KEY}=&<query>`);
}

export function migrateJumpDataEngines<T extends JumpEngineLike>(
  engines: T[],
): { engines: T[]; changed: boolean } {
  let changed = false;
  const migrated = engines.map((engine) => {
    const jumpUrl = migrateInjectJumpUrl(engine.jumpUrl, engine.injectPrompt);
    if (jumpUrl === engine.jumpUrl) return engine;
    changed = true;
    return { ...engine, jumpUrl };
  });
  return { engines: migrated, changed };
}

export function serializeJumpEngines(engines: JumpEngineLike[]): string {
  return JSON.stringify(
    engines.map((engine) => ({
      key: engine.key,
      label: engine.label,
      jumpUrl: engine.jumpUrl,
      ...(engine.iconUrl ? { iconUrl: engine.iconUrl } : {}),
      ...(engine.injectPrompt ? { injectPrompt: true } : {}),
    })),
  );
}
