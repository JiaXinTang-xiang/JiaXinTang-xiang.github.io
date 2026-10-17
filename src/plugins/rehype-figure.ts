import type { Element, ElementContent, Root } from 'hast'

function walk(nodes: Root['children']): Root['children'] {
  const result: Root['children'] = []

  for (const node of nodes) {
    if (
      node.type === 'element' &&
      node.tagName === 'p' &&
      node.children &&
      node.children.length === 1 &&
      node.children[0].type === 'element' &&
      (node.children[0] as Element).tagName === 'img'
    ) {
      const img = node.children[0] as Element
      const alt = (img.properties?.alt as string) || ''

      const figure: Element = {
        type: 'element',
        tagName: 'figure',
        properties: {},
        children: [
          img,
          {
            type: 'element',
            tagName: 'figcaption',
            properties: {},
            children: [{ type: 'text', value: alt }]
          }
        ]
      }

      result.push(figure)
    } else if (node.type === 'element' && node.children) {
      result.push({
        ...node,
        children: walk(node.children) as ElementContent[]
      })
    } else {
      result.push(node)
    }
  }

  return result
}

// Wrap standalone images in <figure> with <figcaption> using alt text
export default function rehypeFigure() {
  return (tree: Root) => {
    if (!tree || !tree.children) return
    tree.children = walk(tree.children)
  }
}
