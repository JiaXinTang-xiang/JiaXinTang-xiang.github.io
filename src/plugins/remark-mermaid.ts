import { visit } from 'unist-util-visit'

/**
 * 把 ```mermaid 代码块转成客户端渲染的容器。
 *
 * 实现选型（前两种都实测失败，结论记录在此，避免以后重走）：
 *  1. 改 node.type 为自定义类型 'mermaid' → mdast-util-to-hast 无对应 handler，
 *     节点被丢弃（实测正文整段消失）
 *  2. 保持 code 类型、用 node.data.hName/hProperties 覆盖输出形态 →
 *     同样被丢弃（实测正文整段消失）
 *  3. ✅ 直接替换成 type:'html' 的原始 HTML 节点。Astro 的 remark-rehype
 *     配置为 allowDangerousHtml: true，原始 HTML 会原样进入 hast，
 *     这是官方支持且无歧义的路径。
 *
 * 生成的结构：
 *   <div class="mermaid-diagram">
 *     <div class="mermaid" data-mermaid-code="…">源码</div>
 *   </div>
 * 客户端脚本按 .mermaid[data-mermaid-code] 查找并渲染成 SVG。
 */

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export function remarkMermaid() {
  return (tree: unknown) => {
    visit(tree as Parameters<typeof visit>[0], 'code', (node: Record<string, any>, index, parent) => {
      if (node.lang !== 'mermaid') return
      if (!parent || typeof index !== 'number') return

      const code = String(node.value ?? '').replace(/\n+$/, '')
      const attr = escapeHtml(code)

      // 源码同时写进子节点，作为 JS 不可用时的可见兜底
      const html =
        `<div class="mermaid-diagram">` +
        `<div class="mermaid" data-mermaid-code="${attr}">${escapeHtml(code)}</div>` +
        `</div>`

      parent.children[index] = { type: 'html', value: html }
    })
  }
}
