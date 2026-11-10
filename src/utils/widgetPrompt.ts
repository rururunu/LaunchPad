export interface WidgetPromptInput {
  title?: string
  minCols?: number
  minRows?: number
  maxCols?: number
  maxRows?: number
  code?: string
  popupCode?: string
}

const fence = (code: string) => '```html\n' + code.trim() + '\n```'

/** 生成交给 AI 的提示词：写清运行环境与限制，并带上当前表单里的尺寸和代码。 */
export function buildWidgetPrompt(input: WidgetPromptInput): string {
  const title = input.title?.trim() || '我的组件'
  const lines = [
    '你是前端工程师。请为浏览器新标签页的「卡片」写一个小组件，只用原生 HTML、CSS、JavaScript。',
    '',
    '## 我想要的小组件',
    '【在这里描述功能和外观，例如：倒计时、番茄钟、天气、待办清单】',
    '',
    `组件名称：${title}`,
    `卡片尺寸（网格）：最小 ${input.minCols ?? 1} 列 × ${input.minRows ?? 1} 行，最大 ${input.maxCols ?? 4} 列 × ${input.maxRows ?? 3} 行。`,
    '',
    '## 运行环境与限制',
    '- 代码运行在隔离的 iframe（sandbox="allow-scripts"）里，不能访问主页、cookie、localStorage、IndexedDB，也不能弹窗、跳转或提交表单。',
    '- 不能用 localStorage / sessionStorage。需要保存数据时用页面已注入的 lp 对象：',
    '  - await lp.get(key) 读取，没有时返回 null；await lp.set(key, value) 保存，value 是可 JSON 序列化的数据，单个 key 不超过 100 KB。',
    '  - lp.onChange((key, value) => {...}) 在同一组件的另一处（卡片和弹窗互相）修改数据时触发。',
    '  - key 只能用字母、数字、下划线、点和短横线；卡片和弹窗共用同一份数据。',
    '- 可以正常获取时间：用 new Date() 和 Intl.DateTimeFormat（按本机时区和语言），用 setInterval 定时刷新，适合时钟、日期、倒计时。',
    '- 需要联网数据时用 fetch，并处理失败状态；目标接口必须允许跨域（CORS），否则请改成不联网的方案。',
    '- 不要引入外部脚本、字体或图片地址，所有样式和逻辑都写在代码里。',
    '- 页面已重置 html/body 的 margin，字体为 system-ui 14px，已设置 box-sizing: border-box。',
    '- 根元素请用 height:100vh 或 min-height:100%，让内容撑满卡片；卡片大小会在上面的网格范围内变化，请用 flex/grid 和相对单位自适应，小尺寸下不要溢出。',
    '- 同时适配浅色和深色：用 @media (prefers-color-scheme: dark) 切换配色。',
    '- 视觉风格：圆角、留白充足、字号层次清晰，接近 macOS / iOS 的简洁风格。',
    '',
    '## 输出格式',
    '1. 「卡片代码」：一个 ```html 代码块，包含完整的 HTML 片段（可含 <style> 和 <script>），不要写 <html>、<head>、<body> 标签。',
    '2. 如果点击卡片需要展开详情，再给一个「弹窗代码」代码块（同样的规则，弹窗大约 800×640）；不需要就写「无弹窗」。',
    '3. 代码块之外只写一两句话说明用法，不要解释实现细节。',
  ]

  const card = input.code?.trim()
  if (card) {
    lines.push('', '## 当前卡片代码（可在此基础上修改，或完全重写）', fence(card))
  }
  const popup = input.popupCode?.trim()
  if (popup) {
    lines.push('', '## 当前弹窗代码', fence(popup))
  }
  return lines.join('\n')
}
