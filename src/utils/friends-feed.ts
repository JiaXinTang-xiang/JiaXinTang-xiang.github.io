import { XMLParser } from 'fast-xml-parser'

interface FriendSite {
  name: string
  link: string
  avatar: string
  rss?: string
}

export interface FriendActivityItem {
  title: string
  link: string
  description: string
  publishedAt: string
  sourceName: string
  avatar: string
}

export interface FriendFeedSource {
  name: string
  status: 'ok' | 'unavailable'
  feedUrl?: string
}

const timeoutMs = 8000
const maxItemsPerSite = 8
const maxItems = 60

const parser = new XMLParser({
  attributeNamePrefix: '@_',
  cdataPropName: '#cdata',
  ignoreAttributes: false,
  textNodeName: '#text',
  trimValues: true
})

const asText = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (!value || typeof value !== 'object') return ''

  const record = value as Record<string, unknown>
  return asText(record['#text'] ?? record['#cdata'] ?? record['content'] ?? record['value'])
}

const asArray = <T>(value: T | T[] | undefined): T[] => {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

const decodeHtml = (value: string) =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

const getAttribute = (tag: string, name: string) => {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
  return match ? decodeHtml(match[1] ?? match[2] ?? match[3] ?? '') : ''
}

const discoverFeedUrl = (html: string, pageUrl: string) => {
  const links = html.match(/<link\b[^>]*>/gi) ?? []
  for (const tag of links) {
    const relation = getAttribute(tag, 'rel').toLowerCase().split(/\s+/)
    const type = getAttribute(tag, 'type').toLowerCase()
    if (!relation.includes('alternate')) continue
    if (!['application/rss+xml', 'application/atom+xml', 'application/xml', 'text/xml'].includes(type)) {
      continue
    }

    const href = getAttribute(tag, 'href')
    if (href) return new URL(href, pageUrl).href
  }

  return ''
}

const fetchText = async (url: string) => {
  const response = await fetch(url, {
    headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html' },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow'
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return { text: await response.text(), url: response.url || url }
}

const getItemLink = (item: Record<string, unknown>, siteUrl: string) => {
  const rawLink = item.link
  if (typeof rawLink === 'object' && rawLink !== null) {
    const href = asText((rawLink as Record<string, unknown>)['@_href'])
    if (href) return new URL(href, siteUrl).href
  }

  const link = asText(rawLink)
  return link ? new URL(link, siteUrl).href : ''
}

const parseFeed = (xml: string, site: FriendSite): FriendActivityItem[] => {
  const document = parser.parse(xml) as Record<string, unknown>
  const rssDocument = document.rss as Record<string, unknown> | undefined
  const channel = rssDocument?.channel
  const atomFeed = document.feed
  const source = (channel ?? atomFeed) as Record<string, unknown> | undefined
  if (!source) return []

  const rawItems = asArray((source.item ?? source.entry) as Record<string, unknown> | Record<string, unknown>[])
  const siteUrl = site.link

  return rawItems
    .map((item) => {
      const title = asText(item.title)
      const link = getItemLink(item, siteUrl)
      const rawDate = asText(item.pubDate ?? item.published ?? item.updated)
      const timestamp = Date.parse(rawDate)
      const description = asText(item.description ?? item.summary ?? item['content:encoded'] ?? item.content)

      return {
        title,
        link,
        description: description.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 220),
        publishedAt: Number.isNaN(timestamp) ? new Date(0).toISOString() : new Date(timestamp).toISOString(),
        sourceName: site.name,
        avatar: site.avatar
      }
    })
    .filter((item) => item.title && item.link && item.publishedAt !== new Date(0).toISOString())
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
    .slice(0, maxItemsPerSite)
}

const readSiteFeed = async (site: FriendSite) => {
  try {
    let feedUrl = site.rss
    let feedText = ''

    if (feedUrl) {
      feedText = (await fetchText(feedUrl)).text
    } else {
      const homepage = await fetchText(site.link)
      feedUrl = discoverFeedUrl(homepage.text, homepage.url || site.link)
      if (!feedUrl) throw new Error('未发现 RSS/Atom 地址')
      feedText = (await fetchText(feedUrl)).text
    }

    return {
      items: parseFeed(feedText, site),
      source: { name: site.name, status: 'ok' as const, feedUrl }
    }
  } catch (error) {
    console.warn(`[friends-feed] ${site.name}: ${error instanceof Error ? error.message : String(error)}`)
    return {
      items: [],
      source: { name: site.name, status: 'unavailable' as const }
    }
  }
}

export const collectFriendsActivity = async (sites: FriendSite[]) => {
  const results = await Promise.all(sites.map(readSiteFeed))
  const items = results
    .flatMap((result) => result.items)
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
    .filter((item, index, all) => all.findIndex((candidate) => candidate.link === item.link) === index)
    .slice(0, maxItems)

  return {
    items,
    sources: results.map((result) => result.source)
  }
}
