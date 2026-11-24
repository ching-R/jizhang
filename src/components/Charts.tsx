import { BarChart, PieChart, SankeyChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { init, use as registerCharts, type EChartsCoreOption } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useMemo, useRef } from 'react'
import { formatYuan } from '../lib/money.ts'
import type { SankeyModel, Slice, YearStack } from '../lib/stats.ts'

registerCharts([PieChart, BarChart, SankeyChart, TooltipComponent, GridComponent, CanvasRenderer])

type ThemeName = 'light' | 'dark'

function tokens(theme: ThemeName) {
  const style = getComputedStyle(document.documentElement)
  const dark = theme === 'dark'
  const pick = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    ink: pick('--ink', dark ? '#f4eee6' : '#1e1b17'),
    muted: pick('--muted', dark ? '#b0a69a' : '#6f675e'),
    line: pick('--line', dark ? '#3a342e' : '#e4ddd2'),
    surface: pick('--surface', dark ? '#221f1c' : '#fffdf9'),
  }
}

function useChart(option: EChartsCoreOption | null) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element || !option) return
    const chart = init(element, undefined, { renderer: 'canvas' })
    chart.setOption(option)
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(element)
    const frame = requestAnimationFrame(() => chart.resize())
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      chart.dispose()
    }
  }, [option])
  return ref
}

function yuan(cents: number): string {
  return `¥${formatYuan(cents)}`
}

export function DonutChart({ slices, theme }: { slices: Slice[]; theme: ThemeName }) {
  const option = useMemo(() => {
    if (slices.length === 0) return null
    const color = tokens(theme)
    return {
      animationDuration: 400,
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: color.surface,
        borderColor: color.line,
        textStyle: { color: color.ink, fontSize: 12 },
        formatter: (item: { name?: string; value?: number; percent?: number }) =>
          `${item.name ?? ''}<br/>¥${Number(item.value ?? 0).toFixed(2)} · ${Math.round(item.percent ?? 0)}%`,
      },
      series: [
        {
          type: 'pie',
          radius: ['58%', '78%'],
          center: ['50%', '46%'],
          label: { show: false },
          labelLine: { show: false },
          data: slices.map((slice) => ({
            name: slice.name,
            value: slice.cents / 100,
            itemStyle: { color: slice.color },
          })),
        },
      ],
    } as EChartsCoreOption
  }, [slices, theme])
  const ref = useChart(option)
  const total = slices.reduce((sum, slice) => sum + slice.cents, 0)
  if (slices.length === 0) return <p className="py-8 text-center text-sm text-muted">这个月还没有支出</p>
  return (
    <div className="relative" data-testid="chart-donut">
      <div ref={ref} className="h-56 w-full" role="img" aria-label="本月支出分类环形图" />
      <div className="pointer-events-none absolute inset-x-0 top-[46%] -translate-y-1/2 text-center">
        <p className="text-xs text-muted">支出</p>
        <p className="text-lg font-semibold tabular-nums">{yuan(total)}</p>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {slices.map((slice) => (
          <li key={slice.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
              <span className="truncate">{slice.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted">{Math.round((slice.cents / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function StackedBarChart({ stack, theme }: { stack: YearStack; theme: ThemeName }) {
  const option = useMemo(() => {
    if (stack.series.length === 0) return null
    const color = tokens(theme)
    return {
      animationDuration: 400,
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: color.surface,
        borderColor: color.line,
        textStyle: { color: color.ink, fontSize: 12 },
        axisPointer: { type: 'shadow' },
      },
      grid: { left: 4, right: 8, top: 12, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category',
        data: stack.labels,
        axisLabel: { color: color.muted, fontSize: 10, hideOverlap: true },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'value',
        splitNumber: 3,
        axisLabel: { color: color.muted, fontSize: 10 },
        splitLine: { lineStyle: { color: color.line } },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: stack.series.map((series) => ({
        type: 'bar',
        name: series.name,
        stack: 'total',
        barMaxWidth: 16,
        itemStyle: { color: series.color },
        emphasis: { focus: 'series' },
        data: series.cents.map((cents) => cents / 100),
      })),
    } as EChartsCoreOption
  }, [stack, theme])
  const ref = useChart(option)
  if (stack.series.length === 0) return <p className="py-8 text-center text-sm text-muted">这一年还没有支出</p>
  return (
    <div data-testid="chart-bar">
      <div ref={ref} className="h-64 w-full" role="img" aria-label="全年分类堆叠柱状图" />
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        {stack.series.map((series) => (
          <span key={series.id} className="inline-flex items-center gap-1 text-xs text-muted">
            <i className="h-2 w-2 rounded-sm" style={{ background: series.color }} />
            {series.name}
          </span>
        ))}
      </div>
    </div>
  )
}

export function SankeyChartView({ model, theme }: { model: SankeyModel | null; theme: ThemeName }) {
  const option = useMemo(() => {
    if (!model) return null
    const color = tokens(theme)
    const labels = new Map(model.nodes.map((node) => [node.key, node.label]))
    const nameOf = (key?: string) => (key ? (labels.get(key) ?? key) : '')
    return {
      animationDuration: 400,
      tooltip: {
        confine: true,
        backgroundColor: color.surface,
        borderColor: color.line,
        textStyle: { color: color.ink, fontSize: 12 },
        formatter: (item: { dataType?: string; name?: string; value?: number; data?: { source?: string; target?: string; value?: number } }) => {
          if (item.dataType === 'edge') {
            const value = Number(item.data?.value ?? item.value ?? 0)
            return `${nameOf(item.data?.source)} → ${nameOf(item.data?.target)}<br/>¥${value.toFixed(2)}`
          }
          return `${nameOf(item.name)}<br/>¥${Number(item.value ?? 0).toFixed(2)}`
        },
      },
      series: [
        {
          type: 'sankey',
          left: 64,
          right: 72,
          top: 8,
          bottom: 8,
          nodeWidth: 14,
          nodeGap: 12,
          draggable: false,
          nodeAlign: 'justify',
          emphasis: { focus: 'adjacency' },
          lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.35 },
          label: {
            color: color.ink,
            fontSize: 11,
            formatter: (item: { name?: string }) => nameOf(item.name),
          },
          levels: [
            { depth: 0, label: { position: 'left' } },
            { depth: 1, label: { position: 'right' } },
          ],
          data: model.nodes.map((node) => ({ name: node.key, itemStyle: { color: node.color } })),
          links: model.links.map((link) => ({
            source: link.source,
            target: link.target,
            value: link.cents / 100,
          })),
        },
      ],
    } as EChartsCoreOption
  }, [model, theme])
  const ref = useChart(option)
  if (!model) return <p className="py-8 text-center text-sm text-muted">这段时间没有收入或支出</p>
  return <div ref={ref} className="h-[420px] w-full" role="img" aria-label="收入流向支出的桑基图" data-testid="chart-sankey" />
}
