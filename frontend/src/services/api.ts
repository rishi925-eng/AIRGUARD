/**
 * AIRGUARD API service — communicates with FastAPI backend.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  ''

export type LocationSuggestion = {
  latitude: number
  longitude: number
  label: string
  type?: string | null
}

export type RouteStep = { instruction: string }

export type AQISample = {
  lat: number
  lon: number
  pm25: number | null
  aqi: number | null
  source: string | null
  is_estimated: boolean
}

export type RouteAlternative = {
  id: string
  name: string
  distance: number          // metres
  duration: number          // seconds
  geometry: { type: 'LineString'; coordinates: [number, number][] }
  average_aqi: number | null
  max_aqi: number | null
  aqi_category?: string | null
  average_pm25: number | null
  pm25_exposure_ug: number | null
  exposure_status: 'estimated' | 'measured' | 'unavailable'
  aqi_data_coverage: number
  aqi_source: string
  timestamp?: string | null
  exposure_reduction_pct: number | null
  steps: RouteStep[]
}

export type LocationAQI = {
  lat: number
  lon: number
  aqi: number | null
  pm25: number | null
  category: string
  warning: string
  source: string
  timestamp?: string | null
  is_estimated: boolean
}

export type SaferRouteRecommendation = {
  recommended_route_id: string | null
  route_name: string | null
  title: string
  reason: string
  health_advisory: string
  exposure_saved_pct: number | null
}

export type RouteCompareResponse = {
  routes: RouteAlternative[]
  origin_aqi: LocationAQI
  destination_aqi: LocationAQI
  safer_route_recommendation: SaferRouteRecommendation
  routing_status: 'ok' | 'failed'
  routing_error: string | null
  mode: string
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = (init as any)?.signal
    ? undefined
    : new AbortController()
  const signal = (init as any)?.signal ?? controller?.signal

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, signal })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const error = new Error(
      body.detail || `Server error ${response.status}`
    ) as Error & { status?: number }
    error.status = response.status
    throw error
  }
  const payload = await response.json()
  if (payload === null || payload === undefined)
    throw new Error('Provider returned an invalid response')
  return payload
}

export function searchLocations(query: string, signal?: AbortSignal) {
  return apiRequest<LocationSuggestion[]>(
    `/api/routes/geocode?q=${encodeURIComponent(query)}`,
    { signal }
  )
}

export function fetchRouteAlternatives(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number },
  mode: string,
  signal?: AbortSignal
) {
  return apiRequest<RouteCompareResponse>('/api/routes/compare', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start, end, mode }),
  })
}

export async function fetchCurrentAQI(lat: number, lon: number, signal?: AbortSignal) {
  const response = await fetch(
    `${API_BASE_URL}/api/air/current?lat=${lat}&lon=${lon}`,
    { signal }
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch AQI data (${response.status})`)
  }
  return response.json()
}

export async function fetchHistoricalAQI(lat: number, lon: number, days = 30, signal?: AbortSignal) {
  return apiRequest<{ data: Array<{ timestamp: string; aqi: number | null; pm25: number | null; pm10: number | null }> }>(
    `/api/air/historical?lat=${lat}&lon=${lon}&days=${days}`,
    { signal },
  )
}

export async function fetchCityComparison(cities: string[], signal?: AbortSignal) {
  return apiRequest<{ comparisons: Array<{ city: string; current_aqi: number | null; pm25: number | null; category: string; source: string }> }>(
    `/api/city/compare?cities=${encodeURIComponent(cities.join(','))}`,
    { signal },
  )
}

export async function fetchForecast(lat: number, lon: number, days = 7) {
  const response = await fetch(`${API_BASE_URL}/api/forecast?lat=${lat}&lon=${lon}&days=${days}`)
  if (!response.ok) throw new Error('Failed to fetch forecast')
  return response.json()
}

export async function fetchHourlyForecast(lat: number, lon: number, hours = 72) {
  const response = await fetch(`${API_BASE_URL}/api/forecast/hourly?lat=${lat}&lon=${lon}&hours=${hours}`)
  if (!response.ok) throw new Error(`Failed to fetch hourly forecast (${response.status})`)
  return response.json()
}

export async function fetchActiveFires(bounds: string) {
  const response = await fetch(`${API_BASE_URL}/api/fire/active?bounds=${bounds}`)
  if (!response.ok) throw new Error('Failed to fetch fire data')
  return response.json()
}

export async function fetchNearbyStations(lat: number, lon: number, radius = 25000) {
  const response = await fetch(`${API_BASE_URL}/api/air/stations?lat=${lat}&lon=${lon}&radius=${radius}`)
  if (!response.ok) throw new Error('Failed to fetch stations')
  return response.json()
}

export async function calculateExposure(data: unknown) {
  const response = await fetch(`${API_BASE_URL}/api/exposure/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to calculate exposure')
  return response.json()
}

export async function chatWithAssistant(message: string, userId: string) {
  const response = await fetch(`${API_BASE_URL}/api/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, user_id: userId }),
  })
  if (!response.ok) throw new Error('Failed to chat with assistant')
  return response.json()
}

export async function subscribeToAlerts(data: unknown) {
  const response = await fetch(`${API_BASE_URL}/api/alerts/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to subscribe to alerts')
  return response.json()
}

export type SchoolAirReport = {
  id: string
  name: string
  campus: string
  area: string
  city: string
  state?: string
  latitude: number
  longitude: number
  student_count: number | null
  aqi: number | null
  pm25: number | null
  category: string
  decision: string
  rec_short: string
  recommendation: string
  action_level: 'SAFE' | 'MODERATE' | 'CAUTION' | 'WARNING' | 'SEVERE' | 'CRITICAL' | 'UNKNOWN'
  badge: string
  outdoor_allowed: boolean
  is_estimated: boolean
  aqi_source: string
  station_name?: string | null
  timestamp?: string
}

export type SchoolSummary = {
  total_schools: number
  total_students: number
  avg_aqi: number | null
  indoor_assembly_count: number
  outdoor_allowed_count: number
}

export type SchoolListResponse = {
  city: string
  total: number
  page: number
  limit: number
  has_more: boolean
  schools: SchoolAirReport[]
  summary: SchoolSummary
}

export async function fetchSchools(
  params: {
    city?: string
    search?: string
    page?: number
    limit?: number
    action_filter?: string
  } = {},
  signal?: AbortSignal
): Promise<SchoolListResponse> {
  const query = new URLSearchParams()
  if (params.city) query.set('city', params.city)
  if (params.search) query.set('search', params.search)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.action_filter) query.set('action_filter', params.action_filter)

  return apiRequest<SchoolListResponse>(`/api/schools?${query.toString()}`, { signal })
}

export async function broadcastParentAdvisory(
  body: {
    city: string
    school_id?: string
    advisory_type?: string
    custom_message?: string
  }
) {
  return apiRequest<{
    success: boolean
    schools_targeted: number
    recipients_notified: number | null
    recipient_status: string
    city: string
    timestamp: string
    broadcast_advisory: string
  }>('/api/schools/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
