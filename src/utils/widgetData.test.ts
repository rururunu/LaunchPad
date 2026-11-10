import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()
vi.mock('@/utils/storage', () => ({
  storage: {
    get: async (key: string) => (store.has(key) ? store.get(key)! : null),
    set: async (key: string, value: string) => { store.set(key, value) },
    remove: async (key: string) => { store.delete(key) },
  },
}))

import { getWidgetData, isValidDataKey, removeWidgetData, setWidgetData, subscribeWidgetData } from './widgetData'

describe('widgetData', () => {
  beforeEach(() => store.clear())

  it('只接受简单的 key', () => {
    expect(isValidDataKey('tasks')).toBe(true)
    expect(isValidDataKey('a.b-c_1')).toBe(true)
    expect(isValidDataKey('../x')).toBe(false)
    expect(isValidDataKey('a:b')).toBe(false)
    expect(isValidDataKey('')).toBe(false)
    expect(isValidDataKey(1)).toBe(false)
  })

  it('读写按组件隔离', async () => {
    await setWidgetData('w1', 'tasks', { a: [1] })
    expect(await getWidgetData('w1', 'tasks')).toEqual({ a: [1] })
    expect(await getWidgetData('w2', 'tasks')).toBeNull()
  })

  it('拒绝过大的数据', async () => {
    await expect(setWidgetData('w1', 'big', 'x'.repeat(100_001))).rejects.toThrow()
  })

  it('同组件的订阅者收到变更，删除时清理数据', async () => {
    const seen: unknown[] = []
    const stop = subscribeWidgetData('w1', (key, value) => seen.push([key, value]))
    await setWidgetData('w1', 'n', 1)
    stop()
    await setWidgetData('w1', 'n', 2)
    expect(seen).toEqual([['n', 1]])

    await removeWidgetData('w1')
    expect(await getWidgetData('w1', 'n')).toBeNull()
    expect([...store.keys()]).toEqual([])
  })
})
