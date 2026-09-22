import { AI_API_KEY, AI_BASE_URL, AI_MODEL } from 'astro:env/server'
import type { APIRoute } from 'astro'
import { aiChat } from '@/ai-config'

/**
 * 看板娘聊天用的服务端代理。
 *
 * 密钥只存在服务端环境变量里，浏览器拿不到，所以必须走这一层。
 * 本站是 output: 'static'，这里用 prerender = false 单独把这条路由开成按需渲染，
 * 部署到 Vercel 后会变成一个 Serverless Function，其余页面仍然全是静态的。
 */
export const prerender = false

type ChatMessage = { role: 'user' | 'assistant'; content: string }

type UpstreamReply = {
  choices?: { message?: { content?: string } }[]
  error?: { message?: string }
}

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  })

/** 只接受干净的 { role, content }，顺便截断长度和历史 */
const normalize = (input: unknown): ChatMessage[] => {
  if (!Array.isArray(input)) return []

  const messages: ChatMessage[] = []
  for (const item of input) {
    if (!item || typeof item !== 'object') continue
    const { role, content } = item as Record<string, unknown>
    if (role !== 'user' && role !== 'assistant') continue
    if (typeof content !== 'string') continue

    const text = content.trim().slice(0, aiChat.maxMessageLength)
    if (text) messages.push({ role, content: text })
  }

  return messages.slice(-aiChat.historyLimit * 2)
}

/** 把上游的错误翻成访客看得懂的一句话，细节留给服务端日志 */
const friendlyError = (status: number, detail: string) => {
  if (status === 401 || status === 403 || /令牌|unauthor|invalid.*key/i.test(detail)) {
    return '我暂时连不上大脑了，站长上线看到的话帮忙换一下 API Key 吧。'
  }
  if (status === 429) return '问得有点快啦，等我喘口气再来～'
  if (status === 402 || /余额|quota|insufficient|balance/i.test(detail)) {
    return '我的额度用完了，明天再来找我聊天吧。'
  }
  return '我这边出了点问题，稍后再试试吧。'
}

export const POST: APIRoute = async ({ request }) => {
  const apiKey = AI_API_KEY
  const model = AI_MODEL || aiChat.model
  const baseUrl = (AI_BASE_URL || aiChat.baseUrl).replace(/\/+$/, '')

  if (!apiKey) {
    console.error('[ai-chat] 缺少环境变量 AI_API_KEY')
    return respond({ error: '服务端还没配置 AI_API_KEY。' }, 500)
  }
  if (!model) {
    console.error('[ai-chat] 缺少模型名（环境变量 AI_MODEL 或 ai.config.ts 的 model）')
    return respond({ error: '服务端还没配置模型名。' }, 500)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return respond({ error: '请求体不是合法的 JSON。' }, 400)
  }

  const messages = normalize((payload as { messages?: unknown } | null)?.messages)
  if (!messages.length) return respond({ error: '没有收到消息。' }, 400)

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: aiChat.systemPrompt }, ...messages],
        stream: false
      }),
      signal: AbortSignal.timeout(aiChat.timeoutMs)
    })

    const data = (await upstream.json().catch(() => null)) as UpstreamReply | null

    if (!upstream.ok) {
      const detail = data?.error?.message ?? ''
      console.error('[ai-chat] 上游返回', upstream.status, baseUrl, detail)
      return respond({ error: friendlyError(upstream.status, detail) }, 502)
    }

    const text = data?.choices?.[0]?.message?.content
    if (typeof text !== 'string' || !text.trim()) {
      console.error('[ai-chat] 上游没有返回内容', JSON.stringify(data)?.slice(0, 300))
      return respond({ error: '没有拿到回复，再试一次？' }, 502)
    }

    return respond({ reply: text.trim() })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError'
    console.error('[ai-chat] 请求失败', error)
    return respond(
      { error: timedOut ? '等太久啦，再试一次吧。' : '我这边出了点问题，稍后再试试吧。' },
      502
    )
  }
}
