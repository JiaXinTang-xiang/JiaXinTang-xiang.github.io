/**
 * Mermaid 客户端渲染器
 *
 * 设计要点：
 *  - mermaid 本体用动态 import 懒加载：只有页面存在图表时才会请求，
 *    且被 Vite 拆成独立 chunk，其他页面完全不受影响
 *  - 不依赖任何 CDN（本机访问境外 CDN 不稳定），走本地打包产物
 *  - 主题跟随：astro-pure 的 setTheme() 只用 classList.toggle('dark')，不派发事件，
 *    所以用 MutationObserver 监听 <html class>
 */

type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void
  render: (id: string, code: string) => Promise<{ svg: string }>
}

let mermaidPromise: Promise<MermaidApi> | null = null
let rendering = false
let lastTheme: string | null = null
let seq = 0

function currentTheme(): 'dark' | 'default' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'default'
}

function loadMermaid(): Promise<MermaidApi> {
  mermaidPromise ??= import('mermaid').then((m) => (m.default ?? m) as unknown as MermaidApi)
  return mermaidPromise
}

function initConfig(theme: 'dark' | 'default') {
  const dark = theme === 'dark'
  return {
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'strict' as const,
    fontFamily: 'inherit',
    flowchart: { useMaxWidth: true, htmlLabels: true },
    themeVariables: {
      fontSize: '15px',
      ...(dark
        ? {
            primaryColor: '#1e293b',
            primaryTextColor: '#e8eef4',
            primaryBorderColor: '#475569',
            lineColor: '#94a3b8',
            secondaryColor: '#334155',
            tertiaryColor: '#0f1720'
          }
        : {
            primaryColor: '#e8f1f6',
            primaryTextColor: '#1b2733',
            primaryBorderColor: '#9db6c4',
            lineColor: '#64798a',
            secondaryColor: '#f2f5f7',
            tertiaryColor: '#ffffff'
          })
    }
  }
}

async function renderAll() {
  if (rendering) return
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('.mermaid[data-mermaid-code]'))
  if (nodes.length === 0) return

  rendering = true
  try {
    const theme = currentTheme()
    const mermaid = await loadMermaid()
    mermaid.initialize(initConfig(theme))
    lastTheme = theme

    await Promise.all(
      nodes.map(async (el) => {
        const code = el.getAttribute('data-mermaid-code')
        if (!code) return
        try {
          const { svg } = await mermaid.render(`mermaid-${Date.now()}-${seq++}`, code)
          el.innerHTML = svg
          el.setAttribute('data-mermaid-rendered', 'true')
          el.removeAttribute('data-mermaid-pending')
          const svgEl = el.querySelector('svg')
          if (svgEl) {
            // 交给 CSS 控制宽度，避免 svg 自带固定尺寸撑破容器
            svgEl.removeAttribute('height')
            svgEl.style.maxWidth = '100%'
            svgEl.style.height = 'auto'
          }
        } catch (err) {
          // 语法错误时直接显示源码，方便对症修改
          el.setAttribute('data-mermaid-error', 'true')
          el.removeAttribute('data-mermaid-pending')
          el.textContent = code
          console.warn('[mermaid] 渲染失败：', err)
        }
      })
    )
  } catch (err) {
    // 连 mermaid 本体都没加载成功：撤掉占位，让源码/兜底内容可见
    document
      .querySelectorAll('[data-mermaid-pending]')
      .forEach((el) => el.removeAttribute('data-mermaid-pending'))
    console.warn('[mermaid] 初始化失败：', err)
  } finally {
    rendering = false
  }
}

export function initMermaid() {
  const nodes = document.querySelectorAll<HTMLElement>('.mermaid[data-mermaid-code]')
  if (nodes.length === 0) return

  nodes.forEach((el) => el.setAttribute('data-mermaid-pending', 'true'))

  // 主题切换时重绘
  new MutationObserver(() => {
    if (currentTheme() !== lastTheme) setTimeout(() => void renderAll(), 50)
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void renderAll(), { once: true })
  } else {
    void renderAll()
  }
}
