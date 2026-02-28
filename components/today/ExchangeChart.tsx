'use client'

import { memo, useCallback, useMemo } from 'react'
import {
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { OHLCData, ChartPeriod, ChartType, ChartViewMode } from './types'

interface ExchangeChartProps {
  chartPeriod: ChartPeriod
  chartType: ChartType
  viewMode: ChartViewMode
  chartData: OHLCData[]
}

type IndexedOHLCData = OHLCData & { idx: number }

function ExchangeChartComponent({ chartPeriod, chartType, viewMode, chartData }: ExchangeChartProps) {
  const indexedData = useMemo<IndexedOHLCData[]>(
    () => chartData.map((point, idx) => ({ ...point, idx })),
    [chartData]
  )

  // X축 간격 계산
  const xAxisInterval = useMemo(() => {
    if (chartPeriod === 'year') return Math.max(1, Math.floor(indexedData.length / 6))
    if (chartPeriod === 'quarter') return Math.max(1, Math.floor(indexedData.length / 5))
    if (chartPeriod === 'month') return Math.max(1, Math.floor(indexedData.length / 5))
    return 'preserveStartEnd'
  }, [chartPeriod, indexedData.length])

  // 툴팁 렌더러
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = useCallback((props: any) => {
    const { active, payload } = props
    if (active && payload && payload.length) {
      const data = payload[0].payload as OHLCData
      const valuePrecision = chartType === 'usd' ? 2 : 2
      return (
        <div className="bg-background/95 backdrop-blur border border-border rounded-lg px-3 py-2 shadow-lg">
          <div className="text-xs text-muted-foreground mb-1">{data.date}</div>
          <div className="text-sm font-bold">종가 {data.close.toFixed(valuePrecision)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            시가 {data.open.toFixed(valuePrecision)} · 고가 {data.high.toFixed(valuePrecision)} · 저가 {data.low.toFixed(valuePrecision)}
          </div>
        </div>
      )
    }
    return null
  }, [chartType])

  const compactDate = useCallback((value: string) => {
    const krMatch = value.match(/(\d+)월\s*(\d+)일/)
    if (krMatch) {
      return `${parseInt(krMatch[1], 10)}/${parseInt(krMatch[2], 10)}`
    }
    const slash = value.split('/')
    if (slash.length === 2) {
      return `${parseInt(slash[0], 10)}/${parseInt(slash[1], 10)}`
    }
    return value
  }, [])

  // X축 포맷터
  const tickFormatter = useCallback((value: number | string) => {
    const idx = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
    if (!Number.isFinite(idx)) return ''
    const label = indexedData[idx]?.date
    return label ? compactDate(label) : ''
  }, [compactDate, indexedData])

  const yAxisDomain = useMemo<[number, number]>(() => {
    const values = indexedData
      .flatMap((item) => [item.low, item.high, item.close])
      .filter((value) => Number.isFinite(value))

    if (values.length === 0) return [0, 1]

    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min

    // 달러 구간에서 축 숫자가 어색하지 않도록 고정 여유치 + 범위 비례 여유를 함께 사용
    const minPadding = chartType === 'usd' ? 0.8 : 0.2
    const dynamicPadding = Math.max(range * 0.12, minPadding)

    if (range < 0.0001) {
      const centerPadding = Math.max(min * 0.02, dynamicPadding)
      return [Math.max(0, min - centerPadding), max + centerPadding]
    }

    return [Math.max(0, min - dynamicPadding), max + dynamicPadding]
  }, [indexedData, chartType])

  const yTickFormatter = useCallback((value: number) => {
    if (!Number.isFinite(value)) return ''
    return value.toFixed(chartType === 'usd' ? 1 : 2)
  }, [chartType])

  if (indexedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">
          데이터를 불러올 수 없습니다
        </div>
      </div>
    )
  }

  const lineColor = chartType === 'usd' ? '#3b82f6' : '#22c55e'

  if (viewMode === 'candle') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={indexedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} vertical={false} />
          <XAxis
            dataKey="idx"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            interval={xAxisInterval}
            tickFormatter={tickFormatter}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            domain={yAxisDomain}
            tickFormatter={yTickFormatter}
            tickCount={6}
            tickMargin={8}
            width={50}
          />
          <Tooltip content={renderTooltip} />

          {/* 툴팁 포인터를 위한 투명 시리즈 */}
          <Area
            type="monotone"
            dataKey="close"
            stroke="transparent"
            fill="transparent"
            fillOpacity={0}
            dot={false}
            activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
          />

          {indexedData.map((point) => {
            const isUp = point.close >= point.open
            const bodyColor = isUp ? '#16a34a' : '#ef4444'
            return (
              <g key={`candle-${point.idx}`}>
                <ReferenceLine
                  segment={[
                    { x: point.idx, y: point.low },
                    { x: point.idx, y: point.high },
                  ]}
                  stroke="#94a3b8"
                  strokeWidth={1}
                />
                <ReferenceLine
                  segment={[
                    { x: point.idx, y: point.open },
                    { x: point.idx, y: point.close },
                  ]}
                  stroke={bodyColor}
                  strokeWidth={6}
                  strokeLinecap="round"
                />
              </g>
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={indexedData}>
        <defs>
          <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={lineColor} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={lineColor} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} vertical={false} />
        <XAxis
          dataKey="idx"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          interval={xAxisInterval}
          tickFormatter={tickFormatter}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          domain={yAxisDomain}
          tickFormatter={yTickFormatter}
          tickCount={6}
          tickMargin={8}
          width={50}
        />
        <Tooltip content={renderTooltip} />
        <Area
          type="monotone"
          dataKey="close"
          stroke={lineColor}
          strokeWidth={2}
          fill="url(#colorClose)"
          dot={false}
          activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export const ExchangeChart = memo(ExchangeChartComponent)
