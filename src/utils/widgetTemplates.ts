import calculatorCard from '@/widgets/templates/calculator.card.html?raw';
import calendarTodoCard from '@/widgets/templates/calendar-todo.card.html?raw';
import calendarTodoPopup from '@/widgets/templates/calendar-todo.popup.html?raw';
import clockCard from '@/widgets/templates/clock.card.html?raw';
import countdownCard from '@/widgets/templates/countdown.card.html?raw';
import countdownPopup from '@/widgets/templates/countdown.popup.html?raw';
import pomodoroCard from '@/widgets/templates/pomodoro.card.html?raw';
import yearProgressCard from '@/widgets/templates/year-progress.card.html?raw';
import type { QuickAccessWidgetInstance } from '@/composables/useQuickLinks';

export interface WidgetTemplate {
  id: string;
  title: string;
  description: string;
  cols: [min: number, max: number, initial: number];
  rows: [min: number, max: number, initial: number];
  code: string;
  popupCode?: string;
}

/** 内置组件模板：添加后就是普通的自定义组件，可以继续编辑代码。 */
export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'calendar-todo', title: '日历待办', description: '今日日期与待办，点击卡片打开月历，事务自动保存',
    cols: [1, 4, 2], rows: [1, 4, 2], code: calendarTodoCard, popupCode: calendarTodoPopup,
  },
  {
    id: 'clock', title: '时钟', description: '大字时钟和日期，点击切换 12/24 小时制',
    cols: [1, 6, 2], rows: [1, 3, 1], code: clockCard,
  },
  {
    id: 'pomodoro', title: '番茄钟', description: '25 分钟专注 / 5 分钟休息，刷新页面后进度不丢',
    cols: [1, 4, 2], rows: [1, 3, 2], code: pomodoroCard,
  },
  {
    id: 'countdown', title: '倒数日', description: '距离目标日期还有多少天，点击卡片修改名称和日期',
    cols: [1, 4, 2], rows: [1, 3, 1], code: countdownCard, popupCode: countdownPopup,
  },
  {
    id: 'year-progress', title: '时间进度', description: '今天、本周、本月、今年已经过去多少',
    cols: [1, 4, 2], rows: [1, 3, 2], code: yearProgressCard,
  },
  {
    id: 'calculator', title: '计算器', description: '四则运算、百分比和正负号',
    cols: [1, 3, 2], rows: [2, 6, 4], code: calculatorCard,
  },
];

export function createWidgetFromTemplate(template: WidgetTemplate, id: string = crypto.randomUUID()): QuickAccessWidgetInstance {
  return {
    id,
    type: 'custom',
    size: 'medium',
    title: template.title,
    minCols: template.cols[0],
    maxCols: template.cols[1],
    minRows: template.rows[0],
    maxRows: template.rows[1],
    gridSize: { cols: template.cols[2], rows: template.rows[2] },
    code: template.code,
    popupCode: template.popupCode ?? '',
  };
}
