export type GeoSample = {
  lat: number
  lng: number
  accuracy: number
  capturedAt: string
}

type CollectOptions = {
  sampleCount?: number
  timeoutMs?: number
  intervalMs?: number
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readOnePosition(timeoutMs: number): Promise<GeoSample> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('이 브라우저는 위치 정보를 지원하지 않습니다.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date().toISOString(),
        })
      },
      (error) => {
        reject(new Error(error.message || '위치 정보를 가져오지 못했습니다.'))
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 2000,
      }
    )
  })
}

export async function collectGeoSamples(options: CollectOptions = {}): Promise<GeoSample[]> {
  const sampleCount = options.sampleCount ?? 4
  const timeoutMs = options.timeoutMs ?? 12000
  const intervalMs = options.intervalMs ?? 5000

  const samples: GeoSample[] = []

  for (let i = 0; i < sampleCount; i += 1) {
    try {
      const sample = await readOnePosition(timeoutMs)
      samples.push(sample)
    } catch {
      // 일부 샘플 실패는 허용하고 다음 샘플을 시도한다.
    }

    if (i < sampleCount - 1) {
      await sleep(intervalMs)
    }
  }

  return samples
}
