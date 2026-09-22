import { aiChat } from '@/ai-config'

/**
 * 聊天接口的额度和频率限制。
 *
 * ⚠️ 这里是**进程内内存**计数，不是共享存储。Vercel 上每个 Serverless 实例各记一份，
 * 冷启动会清零、多实例之间也不互通。所以它挡得住「有人写脚本猛刷接口」这种最常见的情况，
 * 但**不是硬性闸门**——真要严格计费上限，得把下面的 buckets 换成 Vercel KV / Upstash 之类的共享存储。
 *
 * 同一个 key 存 { 计数, 重置时间 }，到点自动重新开始，不需要定时任务。
 */
type Bucket = { count: number; resetAt: number }

const DAY_MS = 24 * 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

const buckets = new Map<string, Bucket>()

/** 桶数量上限，超了就顺手清一遍过期的，防止内存无限涨 */
const MAX_BUCKETS = 5000

const prune = () => {
  if (buckets.size <= MAX_BUCKETS) return
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/** 记一次访问，返回是否还在额度内 */
const hit = (key: string, windowMs: number, limit: number) => {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  bucket.count += 1
  return bucket.count <= limit
}

export type QuotaVerdict = { ok: true } | { ok: false; message: string }

/**
 * IP 和设备 ID 双重校验：任意一个超额就拦下。
 * deviceId 是前端 localStorage 里生成的，可以伪造，但配合 IP 能挡住大部分顺手刷的。
 */
export const checkChatQuota = (clientIp: string, deviceId: string): QuotaVerdict => {
  prune()

  const { perMinute, perDay, perDayTotal } = aiChat.limits

  const minuteOk =
    hit(`minute:ip:${clientIp}`, MINUTE_MS, perMinute) &&
    hit(`minute:dev:${deviceId}`, MINUTE_MS, perMinute)
  if (!minuteOk) return { ok: false, message: '问得有点快啦，等我喘口气再来～' }

  const dayOk =
    hit(`day:ip:${clientIp}`, DAY_MS, perDay) && hit(`day:dev:${deviceId}`, DAY_MS, perDay)
  if (!dayOk) return { ok: false, message: '你今天问得有点多啦，给别人也留一点，明天再来～' }

  if (!hit('day:total', DAY_MS, perDayTotal)) {
    return { ok: false, message: '今天全站的额度用完啦，明天再来找我聊天吧。' }
  }

  return { ok: true }
}
