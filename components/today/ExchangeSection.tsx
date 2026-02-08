'use client'

import { useState, useCallback } from 'react'
import { TrendingUp, Calculator, RefreshCw } from 'lucide-react'
import { ExchangeRates, OHLCData, ChartPeriod, ChartType } from './types'
import { ExchangeCalculatorModal } from './ExchangeCalculatorModal'
import { ExchangeChartModal } from './ExchangeChartModal'

interface ExchangeSectionProps {
  exchangeRates: ExchangeRates | null
  isRefreshingExchangeRates: boolean
  onRefreshExchangeRates: () => void
  loadChartData: (type: ChartType, period: ChartPeriod) => Promise<void>
  chartData: OHLCData[]
  isLoadingChart: boolean
}

export function ExchangeSection({
  exchangeRates,
  isRefreshingExchangeRates,
  onRefreshExchangeRates,
  loadChartData,
  chartData,
  isLoadingChart,
}: ExchangeSectionProps) {
  const [showCalculator, setShowCalculator] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const [chartType, setChartType] = useState<ChartType>('rub')
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('week')

  const handleOpenChart = useCallback((type: ChartType) => {
    setChartType(type)
    setShowChart(true)
    loadChartData(type, chartPeriod)
  }, [chartPeriod, loadChartData])

  const handlePeriodChange = useCallback((period: ChartPeriod) => {
    setChartPeriod(period)
    loadChartData(chartType, period)
  }, [chartType, loadChartData])

  return (
    <>
      <div className="glass-strong rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            <h2 className="font-bold text-sm">환율</h2>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={onRefreshExchangeRates}
              disabled={isRefreshingExchangeRates}
              className="p-1.5 hover:bg-background rounded-lg transition-colors disabled:opacity-50"
              aria-label="환율 새로고침"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-muted-foreground ${
                  isRefreshingExchangeRates ? 'animate-spin' : ''
                }`}
              />
            </button>
            <button
              onClick={() => setShowCalculator(true)}
              className="p-1.5 hover:bg-background rounded-lg transition-colors"
              aria-label="환율 계산기"
            >
              <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>
          </div>
        </div>

        {exchangeRates ? (
          <div className="flex gap-2">
            <button
              onClick={() => handleOpenChart('rub')}
              className="flex-1 flex items-center justify-between py-2 px-3 bg-background rounded-lg border border-border hover:border-primary transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base">₽</span>
                <span className="text-xs text-muted-foreground">1루블</span>
              </div>
              <div className="font-bold text-sm">{(1 / exchangeRates.krwToRub).toFixed(2)}원</div>
            </button>

            <button
              onClick={() => handleOpenChart('usd')}
              className="flex-1 flex items-center justify-between py-2 px-3 bg-background rounded-lg border border-border hover:border-primary transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base">$</span>
                <span className="text-xs text-muted-foreground">1달러</span>
              </div>
              <div className="font-bold text-sm">{(1 / exchangeRates.rubToUsd).toFixed(2)}₽</div>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-3">
            <div className="text-sm text-muted-foreground">환율 정보를 불러오는 중...</div>
          </div>
        )}
      </div>

      {/* 환율 계산기 모달 */}
      {showCalculator && exchangeRates && (
        <ExchangeCalculatorModal
          exchangeRates={exchangeRates}
          onClose={() => setShowCalculator(false)}
        />
      )}

      {/* 환율 그래프 모달 */}
      {showChart && exchangeRates && (
        <ExchangeChartModal
          chartType={chartType}
          chartPeriod={chartPeriod}
          chartData={chartData}
          isLoadingChart={isLoadingChart}
          onClose={() => setShowChart(false)}
          onPeriodChange={handlePeriodChange}
        />
      )}
    </>
  )
}
