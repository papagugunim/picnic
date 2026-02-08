'use client'

import { memo, useCallback, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { OHLCData, ChartPeriod } from './types'

interface ExchangeChartProps {
  chartPeriod: ChartPeriod
  chartData: OHLCData[]
}

function ExchangeChartComponent({ chartPeriod, chartData }: ExchangeChartProps) {
  // X축 간격 계산
  const xAxisInterval = useMemo(() => {
    if (chartPeriod === 'year') return Math.floor(chartData.length / 6)
    if (chartPeriod === 'quarter') return Math.floor(chartData.length / 5)
    if (chartPeriod === 'month') return Math.floor(chartData.length / 5)
    return 'preserveStartEnd'
  }, [chartPeriod, chartData.length])

  // 툴팁 렌더러
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = useCallback((props: any) => {
    const { active, payload } = props
    if (active && payload && payload.length) {
      const data = payload[0].payload as OHLCData
      return (
        <div className="bg-background/95 backdrop-blur border border-border rounded-lg px-3 py-2 shadow-lg">
          <div className="text-xs text-muted-foreground mb-1">{data.date}</div>
          <div className="text-sm font-bold">{data.close.toFixed(2)}</div>
        </div>
      )
    }
    return null
  }, [])

  // X축 포맷터
  const tickFormatter = useCallback((value: string) => {
    const parts = value.split('/')
    if (parts.length === 2) {
      return `${parseInt(parts[0])}/${parseInt(parts[1])}`
    }
    return value
  }, [])

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">
          데이터를 불러올 수 없습니다
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} vertical={false} />
        <XAxis
          dataKey="date"
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
          domain={['dataMin - 0.5', 'dataMax + 0.5']}
          tickMargin={8}
          width={45}
        />
        <Tooltip content={renderTooltip} />
        <Area
          type="monotone"
          dataKey="close"
          stroke="#22c55e"
          strokeWidth={2}
          fill="url(#colorClose)"
          dot={false}
          activeDot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export const ExchangeChart = memo(ExchangeChartComponent)
