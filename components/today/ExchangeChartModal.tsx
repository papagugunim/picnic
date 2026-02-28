'use client'

import { memo, useCallback, useMemo, useState } from 'react'
import { TrendingUp, X, RefreshCw } from 'lucide-react'
import dynamic from 'next/dynamic'
import { OHLCData, ChartPeriod, ChartType, ChartViewMode } from './types'
import { CHART_PERIOD_CONFIG } from './constants'

// 차트 컴포넌트 단일 dynamic import (recharts 번들을 하나의 청크로 로드)
const ExchangeChart = dynamic(
  () => import('./ExchangeChart').then(mod => ({ default: mod.ExchangeChart })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          차트 로딩 중...
        </div>
      </div>
    ),
  }
)

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
  const [viewMode, setViewMode] = useState<ChartViewMode>('line')

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

        {/* 기간 + 시각화 선택 */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="inline-flex items-center rounded-lg bg-background p-1">
            <button
              type="button"
              onClick={() => setViewMode('line')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'line'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              라인
            </button>
            <button
              type="button"
              onClick={() => setViewMode('candle')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'candle'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              캔들
            </button>
          </div>

          <div className="flex gap-2">
          {periods.map(period => (
            <PeriodButton
              key={period}
              period={period}
              currentPeriod={chartPeriod}
              onClick={onPeriodChange}
            />
          ))}
          </div>
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
          ) : (
            <ExchangeChart
              chartPeriod={chartPeriod}
              chartType={chartType}
              viewMode={viewMode}
              chartData={chartData}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export const ExchangeChartModal = memo(ExchangeChartModalComponent)
