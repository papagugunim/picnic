export type SupportedCity = 'moscow' | 'spb'

export type GeoSample = {
  lat: number
  lng: number
  accuracy: number
  capturedAt: string
}

export type CityVerificationResult = {
  pass: boolean
  score: number
  distanceKm: number
  effectiveRadiusKm: number
  avgAccuracyM: number
  sampleCount: number
}

const EARTH_RADIUS_KM = 6371

export const CITY_COORDS: Record<SupportedCity, { lat: number; lng: number }> = {
  moscow: { lat: 55.7558, lng: 37.6173 },
  spb: { lat: 59.9343, lng: 30.3351 },
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

export function haversineDistanceKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

function weightedAverage(samples: GeoSample[]) {
  const weighted = samples.reduce(
    (acc, sample) => {
      const safeAccuracy = Math.max(sample.accuracy, 10)
      const weight = 1 / safeAccuracy
      return {
        lat: acc.lat + sample.lat * weight,
        lng: acc.lng + sample.lng * weight,
        weight: acc.weight + weight,
      }
    },
    { lat: 0, lng: 0, weight: 0 }
  )

  return {
    lat: weighted.lat / weighted.weight,
    lng: weighted.lng / weighted.weight,
  }
}

export function verifyCityByGps(city: SupportedCity, samples: GeoSample[]): CityVerificationResult {
  const cleanSamples = samples
    .filter((sample) => Number.isFinite(sample.lat) && Number.isFinite(sample.lng) && Number.isFinite(sample.accuracy))
    .slice(0, 8)

  if (!cleanSamples.length) {
    return {
      pass: false,
      score: 0,
      distanceKm: 999,
      effectiveRadiusKm: 30,
      avgAccuracyM: 9999,
      sampleCount: 0,
    }
  }

  const avgAccuracyM = cleanSamples.reduce((sum, s) => sum + Math.max(s.accuracy, 0), 0) / cleanSamples.length
  const position = weightedAverage(cleanSamples)
  const distanceKm = haversineDistanceKm(position, CITY_COORDS[city])

  const baseRadiusKm = 30
  const relaxedRadiusKm = Math.min(60, Math.max(baseRadiusKm, avgAccuracyM / 1000 + 10))
  const pass = distanceKm <= relaxedRadiusKm

  const scoreFromDistance = Math.max(0, 100 - Math.round(distanceKm * 2))
  const scoreFromAccuracy = Math.max(0, 100 - Math.round(avgAccuracyM / 20))
  const score = Math.round(scoreFromDistance * 0.7 + scoreFromAccuracy * 0.3)

  return {
    pass,
    score,
    distanceKm: Number(distanceKm.toFixed(2)),
    effectiveRadiusKm: Number(relaxedRadiusKm.toFixed(2)),
    avgAccuracyM: Number(avgAccuracyM.toFixed(1)),
    sampleCount: cleanSamples.length,
  }
}
