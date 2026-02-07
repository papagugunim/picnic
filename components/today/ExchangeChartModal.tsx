'use client'

import { memo, useCallback, useMemo } from 'react'
import { TrendingUp, X, RefreshCw } from 'lucide-react'
import dynamic from 'next/dynamic'
import { OHLCData, ChartPeriod, ChartType } from './types'
import { CHART_PERIOD_CONFIG } from './constants'

// 차트 컴포넌트 동적 임포트 (번들 크기 최적화)
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false })
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })

interface ExchangeChartModalProps {
  chartType: ChartType
  chartPeriod: ChartPeriod
  chartData: OHLCData[]
  isLoadingChart: boolean
  onClose: () => void
  onPeriodChange: (period: ChartPeriod) => void
}

// 기간 버튼 컴포넌트
const PeriodButton = memo(function PeriodButton({
  period,
  currentPeriod,
  onClick
}: {
  period: ChartPeriod
  currentPeriod: ChartPeriod
  onClick: (period: ChartPeriod) => void
}) {
  const handleClick = useCallback(() => {
    onClick(period)
  }, [onClick, period])

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        currentPeriod === period
          ? 'bg-primary text-primary-foreground'
          : 'bg-background hover:bg-muted'
      }`}
    >
      {CHART_PERIOD_CONFIG[period].label}
    </button>
  )
})

function ExchangeChartModalComponent({
  chartType,
  chartPeriod,
  chartData,
  isLoadingChart,
  onClose,
  onPeriodChange
}: ExchangeChartModalProps) {
  // 배경 클릭 시 닫기
  const handleBackdropClick = useCallback(() => {
    onClose()
  }, [onClose])

  // 모달 내용 클릭 시 이벤트 전파 중단
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  // 차트 제목
  const chartTitle = useMemo(() => {
    return chartType === 'rub' ? '루블 환율 추이' : '달러(대 루블) 환율 추이'
  }, [chartType])

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

  // 기간 목록
  const periods: ChartPeriod[] = useMemo(() => ['week', 'month', 'quarter', 'year'], [])

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="glass-strong rounded-xl p-6 max-w-2xl w-full"
        onClick={handleContentClick}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h2 className="text-lg font-bold">{chartTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* 기간 선택 */}
        <div className="flex gap-2 mb-4">
          {periods.map(period => (
            <PeriodButton
              key={period}
              period={period}
              currentPeriod={chartPeriod}
              onClick={onPeriodChange}
            />
          ))}
        </div>

        {/* 그래프 */}
        <div className="h-56">
          {isLoadingChart ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                환율 데이터 로딩 중...
              </div>
            </div>
          ) : chartData.length > 0 ? (
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
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-muted-foreground">
                데이터를 불러올 수 없습니다
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const ExchangeChartModal = memo(ExchangeChartModalComponent)
