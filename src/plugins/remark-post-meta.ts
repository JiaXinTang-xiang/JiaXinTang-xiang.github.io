import type { Root } from 'mdast'
import { toString } from 'mdast-util-to-string'
import getReadingTime from 'reading-time'
import type { Plugin } from 'unified'

/**
 * 在 remark 阶段统计正文字数与预估阅读时长，写入 frontmatter，
 * 供 Hero / PostPreview 读取（remarkPluginFrontmatter.minutesRead）。
 */
export const remarkReadingTime: Plugin<[], Root> = () => {
  return (tree, file) => {
    const textOnPage = toString(tree)
    const readingTime = getReadingTime(textOnPage)
    const fm = file.data.astro?.frontmatter as Record<string, unknown> | undefined
    if (!fm) return
    fm.minutesRead = Math.max(1, Math.round(readingTime.minutes))
    fm.words = readingTime.words
  }
}

/**
 * 取正文第一个段落作为摘要，写入 frontmatter.excerpt。
 * 找不到段落（例如以列表/表格开头）时留空，不报错。
 */
export const remarkExcerpt: Plugin<[], Root> = () => {
  return (tree, file) => {
    let excerpt = ''
    for (const node of tree.children) {
      if (node.type !== 'paragraph') continue
      excerpt = toString(node)
      break
    }
    const fm = file.data.astro?.frontmatter as Record<string, unknown> | undefined
    if (!fm) return
    fm.excerpt = excerpt
  }
}
