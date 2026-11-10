import { storage } from '@/utils/storage';

/**
 * 小组件数据：沙箱里的代码通过 lp.get / lp.set 读写。
 * 每个组件只能访问自己的命名空间，数据保存在插件本地存储里。
 */
const DATA_PREFIX = 'customWidgetData:';
const INDEX_PREFIX = 'customWidgetDataIndex:';
export const MAX_WIDGET_VALUE_LENGTH = 100_000;
export const MAX_WIDGET_KEYS = 50;

type Listener = (key: string, value: unknown, origin: unknown) => void;
const listeners = new Map<string, Set<Listener>>();

export const isValidDataKey = (key: unknown): key is string =>
  typeof key === 'string' && /^[\w.-]{1,64}$/.test(key);

const dataKey = (id: string, key: string) => `${DATA_PREFIX}${id}:${key}`;
const indexKey = (id: string) => `${INDEX_PREFIX}${id}`;

async function readIndex(id: string): Promise<string[]> {
  const raw = await storage.get<string>(indexKey(id));
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.filter(isValidDataKey) : [];
  } catch {
    return [];
  }
}

export async function getWidgetData(id: string, key: string): Promise<unknown> {
  if (!isValidDataKey(key)) throw new Error('无效的 key');
  const raw = await storage.get<string>(dataKey(id, key));
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function setWidgetData(id: string, key: string, value: unknown, origin?: unknown): Promise<void> {
  if (!isValidDataKey(key)) throw new Error('无效的 key');
  const text = JSON.stringify(value ?? null);
  if (text.length > MAX_WIDGET_VALUE_LENGTH) throw new Error('数据过大，单个 key 不能超过 100 KB');

  const index = await readIndex(id);
  if (!index.includes(key)) {
    if (index.length >= MAX_WIDGET_KEYS) throw new Error('key 数量过多');
    await storage.set(indexKey(id), JSON.stringify([...index, key]));
  }
  await storage.set(dataKey(id, key), text);
  listeners.get(id)?.forEach((fn) => fn(key, value ?? null, origin));
}

/** 删除组件时一并清理它的数据。 */
export async function removeWidgetData(id: string): Promise<void> {
  const index = await readIndex(id);
  await Promise.all(index.map((key) => storage.remove(dataKey(id, key))));
  await storage.remove(indexKey(id));
}

/** 同一组件的卡片和弹窗是两个 iframe，靠它互相同步。 */
export function subscribeWidgetData(id: string, fn: Listener): () => void {
  let set = listeners.get(id);
  if (!set) listeners.set(id, (set = new Set()));
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (!set!.size) listeners.delete(id);
  };
}
