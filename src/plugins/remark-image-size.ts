import type { Properties } from 'hast'
import { fromHtml } from 'hast-util-from-html'
import type { Image, Root, RootContent } from 'mdast'
import { defaultHandlers, type Handler } from 'mdast-util-to-hast'
import type { Plugin } from 'unified'

declare module 'mdast' {
  interface Image {
    // astro-pure 会重写 image.data；把作者指定的样式单独保存到转换阶段。
    displayProperties?: Properties
  }
}

const sizePattern = /!\[([^\]\n]*)\]\(([^\s()]+)\s+=(?:([1-9]\d*)?x([1-9]\d*)?|([1-9]\d*)px)\)/g
const htmlImagePattern = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi

function sizedImages(value: string): RootContent[] {
  const nodes: RootContent[] = []
  let end = 0
  for (const match of value.matchAll(sizePattern)) {
    const [full, alt, url, width, explicitHeight, pixelHeight] = match
    const height = explicitHeight || pixelHeight
    if (!width && !height) continue
    if (match.index > end) nodes.push({ type: 'text', value: value.slice(end, match.index) })
    // 高度单独指定时，同时受原图和容器宽度约束，窄屏也保持原比例。
    const style = width
      ? `width: ${width}px; height: ${height ? `${height}px` : 'auto'}; max-width: 100%;`
      : `width: auto; height: auto; max-height: ${height}px; max-width: 100%;`
    nodes.push({ type: 'image', url, alt, displayProperties: { style } })
    end = match.index + full.length
  }
  if (end < value.length) nodes.push({ type: 'text', value: value.slice(end) })
  return nodes
}

function localHtmlImages(value: string): RootContent[] {
  const nodes: RootContent[] = []
  let end = 0
  for (const match of value.matchAll(htmlImagePattern)) {
    const element = fromHtml(match[0], { fragment: true }).children[0]
    if (element?.type !== 'element') continue
    const { src, alt, title, ...properties } = element.properties
    // public 路径和远程地址由浏览器直接加载；src/content 相对路径交给 Astro。
    if (typeof src !== 'string' || src.startsWith('/') || /^[a-z][\w+.-]*:/i.test(src)) continue
    if (match.index > end) nodes.push({ type: 'html', value: value.slice(end, match.index) })
    nodes.push({
      type: 'image',
      url: src,
      alt: typeof alt === 'string' ? alt : '',
      title: typeof title === 'string' ? title : undefined,
      displayProperties: properties
    })
    end = match.index + match[0].length
  }
  if (end < value.length) nodes.push({ type: 'html', value: value.slice(end) })
  return nodes
}

/** 尺寸扩展，以及 HTML 模板中的相对图片路径。代码块和行内代码保持原样。 */
export const remarkImageSize: Plugin<[], Root> = () => {
  function walk(nodes: RootContent[]) {
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index]
      if ('children' in node) walk(node.children as RootContent[])
      const replacements =
        node.type === 'text'
          ? sizedImages(node.value)
          : node.type === 'html'
            ? localHtmlImages(node.value)
            : null
      if (replacements?.some((item) => item.type === 'image')) {
        nodes.splice(index, 1, ...replacements)
        index += replacements.length - 1
      }
    }
  }
  return (tree) => walk(tree.children)
}

/** 主题插件运行后再应用显示尺寸，同时保留点击放大 class。 */
export const imageWithDisplayProperties: Handler = (state, node) => {
  const image = node as Image
  const element = defaultHandlers.image(state, image)
  if (element?.type === 'element' && image.displayProperties) {
    const classes = [
      element.properties.class,
      element.properties.className,
      image.displayProperties.className
    ]
      .flat()
      .filter(Boolean)
      .join(' ')
      .split(/\s+/)
    element.properties = { ...element.properties, ...image.displayProperties }
    delete element.properties.class
    element.properties.className = [...new Set(classes)]
  }
  return element
}
