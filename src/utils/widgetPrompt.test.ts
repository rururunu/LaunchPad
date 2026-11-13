import { describe, expect, it } from 'vitest'
import { buildWidgetPrompt } from './widgetPrompt'

describe('buildWidgetPrompt', () => {
  it('带上名称、尺寸范围和当前代码', () => {
    const text = buildWidgetPrompt({ title: '倒计时', minCols: 1, minRows: 2, maxCols: 5, maxRows: 4, code: '<p>hi</p>' })
    expect(text).toContain('组件名称：倒计时')
    expect(text).toContain('最小 1 列 × 2 行，最大 5 列 × 4 行')
    expect(text).toContain('<p>hi</p>')
    expect(text).not.toContain('当前弹窗代码')
    expect(text).toContain('new Date()')
    expect(text).toContain('不要把按钮、图标、菜单等界面放在右上角')
  })

  it('有弹窗代码时附上，缺省值回退', () => {
    const text = buildWidgetPrompt({ popupCode: '<b>pop</b>' })
    expect(text).toContain('组件名称：我的组件')
    expect(text).toContain('最小 1 列 × 1 行，最大 4 列 × 3 行')
    expect(text).toContain('<b>pop</b>')
  })
})
