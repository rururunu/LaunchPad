import { describe, expect, it } from 'vitest'
import { isValidCustomWidget } from './customWidget'
import { createWidgetFromTemplate, upgradeStockWidget, WIDGET_TEMPLATES } from './widgetTemplates'

describe('widget templates', () => {
  it('每个模板生成的组件都通过校验，且尺寸范围自洽', () => {
    expect(WIDGET_TEMPLATES.length).toBeGreaterThanOrEqual(5)
    for (const template of WIDGET_TEMPLATES) {
      const widget = createWidgetFromTemplate(template, `t-${template.id}`)
      expect(isValidCustomWidget(widget), template.id).toBe(true)
      expect(widget.gridSize!.cols).toBeGreaterThanOrEqual(widget.minCols!)
      expect(widget.gridSize!.cols).toBeLessThanOrEqual(widget.maxCols!)
      expect(widget.gridSize!.rows).toBeGreaterThanOrEqual(widget.minRows!)
      expect(widget.gridSize!.rows).toBeLessThanOrEqual(widget.maxRows!)
    }
  })

  it('内置卡片把右上角留给拖动手柄，改过的代码不会被覆盖', () => {
    const calendar = WIDGET_TEMPLATES.find((item) => item.id === 'calendar-todo')!
    expect(calendar.code).toContain('padding:16px 40px 16px 16px')
    expect(calendar.code).not.toContain('justify-content:space-between')
    expect(calendar.code.indexOf('class="badge"')).toBeLessThan(calendar.code.indexOf('</div>\n  </div>'))
    for (const template of WIDGET_TEMPLATES) {
      expect(upgradeStockWidget({ code: template.code }).code).toBe(template.code)
    }
    expect(upgradeStockWidget({ code: '<div class="app">custom</div>' }).code).toBe('<div class="app">custom</div>')
  })

  it('模板 id 唯一，代码不依赖外部资源', () => {
    const ids = WIDGET_TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const template of WIDGET_TEMPLATES) {
      expect(`${template.code}${template.popupCode ?? ''}`, template.id).not.toMatch(/(src|href)=["']https?:/)
    }
  })
})
