'use client'

import { useState, useEffect } from 'react'

type MetroStation = {
  readonly value: string
  readonly label: string
  readonly line: string
  readonly lineColor: string
}

export function useMetroStations(city: string | null | undefined) {
  const [stations, setStations] = useState<readonly MetroStation[]>([])

  useEffect(() => {
    if (!city) {
      setStations([])
      return
    }

    import('@/lib/metro-data').then(({ MOSCOW_METRO_STATIONS, SPB_METRO_STATIONS }) => {
      const isMoscow = city.toLowerCase() === 'moscow' || city === 'Moscow'
      setStations(isMoscow ? MOSCOW_METRO_STATIONS : SPB_METRO_STATIONS)
    })
  }, [city])

  return stations
}
