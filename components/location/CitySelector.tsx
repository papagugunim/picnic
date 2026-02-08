'use client'

import { useState, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { CITIES } from '@/lib/constants'
import type { MetroStation, MetroLineColor } from '@/lib/metro-stations'

interface CitySelectorProps {
  disabled?: boolean
}

export default function CitySelector({ disabled }: CitySelectorProps) {
  const form = useFormContext()
  const selectedCity = form.watch('city')

  const [metroStations, setMetroStations] = useState<MetroStation[]>([])
  const [lineColors, setLineColors] = useState<Record<string, MetroLineColor>>({})

  // 도시가 변경되면 지하철역 선택 초기화 & 데이터 로드
  useEffect(() => {
    if (selectedCity) {
      form.setValue('metroStation', '', { shouldValidate: false })

      import('@/lib/metro-stations').then((mod) => {
        if (selectedCity === CITIES.MOSCOW) {
          setMetroStations(mod.MOSCOW_METRO_STATIONS)
          setLineColors(mod.MOSCOW_LINE_COLORS)
        } else if (selectedCity === CITIES.SPB) {
          setMetroStations(mod.SPB_METRO_STATIONS)
          setLineColors(mod.SPB_LINE_COLORS)
        } else {
          setMetroStations([])
          setLineColors({})
        }
      })
    } else {
      setMetroStations([])
      setLineColors({})
    }
  }, [selectedCity, form])

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="city"
        render={({ field }) => (
          <FormItem>
            <FormLabel>내가 사는 도시</FormLabel>
            <FormControl>
              <div className="grid grid-cols-2 gap-3">
                {/* Moscow */}
                <Button
                  type="button"
                  variant={field.value === CITIES.MOSCOW ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col items-center gap-2"
                  onClick={() => field.onChange(CITIES.MOSCOW)}
                  disabled={disabled}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h2m0 0h2m-2 0v2m0-2V7"/>
                    <circle cx="12" cy="8" r="1.5" fill="currentColor"/>
                    <path d="M9 21v-4h6v4"/>
                  </svg>
                  <div className="text-center">
                    <div className="font-semibold">Moscow</div>
                    <div className="text-xs text-muted-foreground">모스크바</div>
                  </div>
                </Button>

                {/* Saint Petersburg */}
                <Button
                  type="button"
                  variant={field.value === CITIES.SPB ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col items-center gap-2"
                  onClick={() => field.onChange(CITIES.SPB)}
                  disabled={disabled}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L3 7v6c0 5 4 9 9 9s9-4 9-9V7l-9-5z"/>
                    <path d="M12 22V11m0 0l-4-3m4 3l4-3"/>
                    <circle cx="12" cy="6" r="1" fill="currentColor"/>
                  </svg>
                  <div className="text-center">
                    <div className="font-semibold">St. Petersburg</div>
                    <div className="text-xs text-muted-foreground">상트페테르부르크</div>
                  </div>
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {selectedCity && (
        <FormField
          control={form.control}
          name="metroStation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>가까운 지하철역</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={disabled}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="지하철역을 선택하세요" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-[300px]">
                  {metroStations.map((station) => {
                    const lineColor = lineColors[station.line]
                    const lineNumber = station.line.replace('Line ', '')
                    return (
                      <SelectItem
                        key={station.value}
                        value={station.value}
                      >
                        <span style={{ color: lineColor?.color }}>●</span> {station.labelKo} ({station.labelRu}) - {lineNumber}호선
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )
}
