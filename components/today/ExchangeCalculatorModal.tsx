'use client'

import { memo, useCallback, useState, useMemo } from 'react'
import { Calculator, X } from 'lucide-react'
import { ExchangeRates } from './types'

interface ExchangeCalculatorModalProps {
  exchangeRates: ExchangeRates
  onClose: () => void
}

// 숫자 포맷팅 함수 (천 단위 쉼표)
const formatNumber = (value: string): string => {
  const num = value.replace(/,/g, '')
  if (!num || isNaN(Number(num))) return value
  return Number(num).toLocaleString('ko-KR')
}

function ExchangeCalculatorModalComponent({ exchangeRates, onClose }: ExchangeCalculatorModalProps) {
  const [rubAmount, setRubAmount] = useState('')
  const [krwAmount, setKrwAmount] = useState('')

  // 환율 계산 함수
  const handleRubChange = useCallback((value: string) => {
    // 쉼표 제거하고 숫자만 추출
    const numericValue = value.replace(/,/g, '')
    setRubAmount(numericValue)

    if (numericValue && exchangeRates) {
      const rub = parseFloat(numericValue)
      if (!isNaN(rub)) {
        const krw = rub / exchangeRates.krwToRub
        setKrwAmount(krw.toFixed(0))
      } else {
        setKrwAmount('')
      }
    } else {
      setKrwAmount('')
    }
  }, [exchangeRates])

  const handleKrwChange = useCallback((value: string) => {
    // 쉼표 제거하고 숫자만 추출
    const numericValue = value.replace(/,/g, '')
    setKrwAmount(numericValue)

    if (numericValue && exchangeRates) {
      const krw = parseFloat(numericValue)
      if (!isNaN(krw)) {
        const rub = krw * exchangeRates.krwToRub
        setRubAmount(rub.toFixed(2))
      } else {
        setRubAmount('')
      }
    } else {
      setRubAmount('')
    }
  }, [exchangeRates])

  // 배경 클릭 시 닫기
  const handleBackdropClick = useCallback(() => {
    onClose()
  }, [onClose])

  // 모달 내용 클릭 시 이벤트 전파 중단
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  // 현재 환율 텍스트
  const rateText = useMemo(() => {
    return `현재 환율: 1₽ = ${(1 / exchangeRates.krwToRub).toFixed(2)}원`
  }, [exchangeRates.krwToRub])

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="glass-strong rounded-xl p-6 max-w-md w-full"
        onClick={handleContentClick}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold">환율 계산기</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">루블 (₽)</label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={formatNumber(rubAmount)}
                onChange={(e) => handleRubChange(e.target.value)}
                placeholder="0"
                className="w-full p-3 pr-8 bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₽</span>
            </div>
          </div>

          <div className="flex items-center justify-center pt-6">
            <div className="text-muted-foreground text-lg">⇄</div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">원화 (₩)</label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={formatNumber(krwAmount)}
                onChange={(e) => handleKrwChange(e.target.value)}
                placeholder="0"
                className="w-full p-3 pr-8 bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₩</span>
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground text-center">
          {rateText}
        </div>
      </div>
    </div>
  )
}

export const ExchangeCalculatorModal = memo(ExchangeCalculatorModalComponent)
