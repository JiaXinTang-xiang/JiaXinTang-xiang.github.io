import type { APIRoute } from 'astro'

export const prerender = false

const apiURL = 'https://analytics.jiaxin404.top/api'
const shareSlug = 'KnPX4p5eUyN749bk'

export const GET: APIRoute = async () => {
  try {
    const read = async (path: string, headers?: HeadersInit) => {
      const response = await fetch(`${apiURL}${path}`, {
        headers,
        signal: AbortSignal.timeout(10000)
      })
      if (!response.ok) throw new Error('Statistics unavailable')
      return response.json()
    }

    // Use the public share permission; no administrator credentials are needed.
    const share = await read(`/share/${shareSlug}`)
    if (typeof share.token !== 'string' || typeof share.websiteId !== 'string') {
      throw new Error('Invalid share response')
    }
    const headers = { 'x-umami-share-token': share.token, 'x-umami-share-context': '1' }
    const endAt = Date.now()
    const chinaDate = new Date(endAt + 8 * 60 * 60 * 1000)
    const today = Date.UTC(chinaDate.getUTCFullYear(), chinaDate.getUTCMonth(), chinaDate.getUTCDate())
    const startAt = today - 8 * 60 * 60 * 1000 - 29 * 86400000
    const query = new URLSearchParams({
      startAt: String(startAt), endAt: String(endAt), unit: 'day', timezone: 'Asia/Shanghai'
    })
    const [stats, series] = await Promise.all([
      read(`/websites/${encodeURIComponent(share.websiteId)}/stats?${query}`, headers),
      read(`/websites/${encodeURIComponent(share.websiteId)}/pageviews?${query}`, headers)
    ])

    for (const field of ['visitors', 'visits', 'pageviews', 'bounces', 'totaltime']) {
      if (!Number.isFinite(stats[field]) || stats[field] < 0) throw new Error('Invalid statistics')
    }
    if (!Array.isArray(series.pageviews) || !Array.isArray(series.sessions)) {
      throw new Error('Invalid series')
    }
    for (const point of [...series.pageviews, ...series.sessions]) {
      if (typeof point.x !== 'string' || !Number.isFinite(point.y) || point.y < 0) {
        throw new Error('Invalid series point')
      }
    }
    const views = new Map<string, number>(series.pageviews.map((p: { x: string; y: number }) => [p.x.slice(0, 10), p.y]))
    const visitors = new Map<string, number>(series.sessions.map((p: { x: string; y: number }) => [p.x.slice(0, 10), p.y]))
    const points = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(today - (29 - index) * 86400000).toISOString().slice(0, 10)
      return { date, visitors: visitors.get(date) ?? 0, pageviews: views.get(date) ?? 0 }
    })

    return Response.json({
      visitors: stats.visitors,
      visits: stats.visits,
      pageviews: stats.pageviews,
      bounceRate: stats.visits ? Math.min(stats.bounces, stats.visits) / stats.visits * 100 : 0,
      duration: stats.visits ? stats.totaltime / stats.visits : 0,
      points
    }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30' } })
  } catch {
    return Response.json({ error: 'Statistics unavailable' }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' }
    })
  }
}
