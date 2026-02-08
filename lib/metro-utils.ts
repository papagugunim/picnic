/**
 * 사용자의 지하철역 기준으로 근처 역들을 찾습니다 (같은 노선의 앞뒤 5개역)
 */
export async function getNearbyMetroStations(
  userStations: string[],
  city: string,
  range: number = 5
): Promise<string[]> {
  if (!userStations || userStations.length === 0) {
    return []
  }

  const { MOSCOW_METRO_STATIONS, SPB_METRO_STATIONS } = await import('./metro-data')

  const stations = city.toLowerCase() === 'moscow'
    ? MOSCOW_METRO_STATIONS
    : SPB_METRO_STATIONS

  const nearbyStations = new Set<string>()

  userStations.forEach((userStation) => {
    // 사용자 역의 인덱스 찾기
    const userIndex = stations.findIndex((s) => s.value === userStation)

    if (userIndex === -1) return

    const userLine = stations[userIndex].line

    // 같은 노선의 모든 역 찾기
    const sameLineStations = stations
      .map((s, idx) => ({ ...s, index: idx }))
      .filter((s) => s.line === userLine)

    // 사용자 역이 같은 노선 내에서 몇 번째인지 찾기
    const lineIndex = sameLineStations.findIndex((s) => s.value === userStation)

    if (lineIndex === -1) return

    // 앞뒤 range개 역 가져오기
    const start = Math.max(0, lineIndex - range)
    const end = Math.min(sameLineStations.length - 1, lineIndex + range)

    for (let i = start; i <= end; i++) {
      nearbyStations.add(sameLineStations[i].value)
    }
  })

  return Array.from(nearbyStations)
}

/**
 * 게시물의 지하철역과 사용자의 근처 역이 겹치는지 확인
 */
export function hasNearbyStation(
  postStations: string[],
  nearbyStations: string[]
): boolean {
  if (!postStations || postStations.length === 0) {
    return false
  }

  return postStations.some((station) => nearbyStations.includes(station))
}
