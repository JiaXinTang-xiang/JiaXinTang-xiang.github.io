import fs from 'node:fs/promises'
import path from 'node:path'
import type { CollectionEntry } from 'astro:content'
import type { APIContext, GetStaticPaths } from 'astro'
import satori from 'satori'
import sharp from 'sharp'

import config from 'virtual:config'
import { ogImage as ogImageConfig } from '@/site-config'

export const prerender = true

type Post = CollectionEntry<'blog' | 'tech' | 'daily' | 'monthly'>
type FeedCollection = 'blog' | 'tech' | 'daily' | 'monthly'

const OGC = {
  width: 1200,
  height: 630,
  // 与站点主色相协调的深色底，正文使用浅色
  bg: '#0f1720',
  panel: '#16202b',
  fg: '#f2f5f7',
  muted: '#93a4b3',
  accent: '#659eb9',
  // 单张卡片最多显示的字数，超出直接截断，避免溢出
  maxTitleChars: 46,
  maxDescChars: 58
}

/**
 * 字体只在一次构建里读一次。
 * 直接读源目录：走 Vite 的 ?url 会把字体复制进 dist/_astro/，多一份 2.2MB 的无用产物。
 */
const FONT_DIR = 'src/assets/fonts'

let fontCache: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 700 }[]> | null = null

function loadFonts() {
  fontCache ??= (async () => {
    const out: { name: string; data: ArrayBuffer; weight: 400 | 700 }[] = []
    for (const weight of [400, 700] as const) {
      const abs = path.resolve(process.cwd(), FONT_DIR, `noto-sans-sc-${weight}.woff`)
      const buf = await fs.readFile(abs)
      out.push({
        name: 'Noto Sans SC',
        // satori 需要 ArrayBuffer，且要避开 Buffer 共享底层 ArrayBuffer 的偏移问题
        data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        weight
      })
    }
    return out
  })()
  return fontCache
}

/** 头像 / logo 转 data URI，失败则返回 null（卡片会跳过该元素） */
async function assetToDataUri(publicPath: string | undefined) {
  if (!publicPath) return null
  try {
    // config.logo.src 形如 /src/assets/head.jpg，构建时 cwd 即项目根目录
    const rel = publicPath.replace(/^\/+/, '')
    const buf = await fs.readFile(path.resolve(process.cwd(), rel))
    const mime = rel.endsWith('.png')
      ? 'image/png'
      : rel.endsWith('.jpg') || rel.endsWith('.jpeg')
        ? 'image/jpeg'
        : 'application/octet-stream'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

export const getStaticPaths = (async () => {
  if (!ogImageConfig.enable) return []

  const { getCollection } = await import('astro:content')
  const collections: FeedCollection[] = ['blog', 'tech', 'daily', 'monthly']
  const all = (
    await Promise.all(collections.map((c) => getCollection(c, ({ data }) => !data.draft)))
  ).flat() as Post[]

  return all.map((post) => ({
    params: { slug: `${post.collection}/${post.id}` },
    props: { post }
  }))
}) satisfies GetStaticPaths

export async function GET({ props }: APIContext<{ post: Post }>) {
  const { post } = props
  const { title, description, publishDate, tags } = post.data

  const fonts = await loadFonts()
  const logo = await assetToDataUri(config.logo?.src)

  const dateText = publishDate.toLocaleDateString(config.locale.dateLocale || 'zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const tagText = (tags ?? []).slice(0, 3).join(' · ')

  const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

  /**
   * satori + 字体子集下，弯引号（U+2018/2019/201C/201D）的推进宽度会被算错，
   * 渲染出多余空隙。OG 卡片只是静态图片，统一换成直引号即可。
   */
  const normalizeQuotes = (s: string) =>
    s.replace(/[\u2018\u2019\u201A\u201B]/g, "'").replace(/[\u201C\u201D\u201E\u201F]/g, '"')

  const siteTitle = normalizeQuotes(config.title)
  const authorName = normalizeQuotes(config.author)
  const cardTitle = normalizeQuotes(truncate(title, OGC.maxTitleChars))
  const cardDesc = description ? normalizeQuotes(truncate(description, OGC.maxDescChars)) : ''
  const cardTags = normalizeQuotes(tagText)

  const template = {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: OGC.bg,
        backgroundImage: `linear-gradient(135deg, ${OGC.bg} 0%, ${OGC.panel} 100%)`,
        padding: '64px 72px',
        fontFamily: 'Noto Sans SC'
      },
      children: [
        // 顶部：站点标识
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', gap: '18px' },
            children: [
              logo
                ? {
                    type: 'img',
                    props: {
                      src: logo,
                      width: 56,
                      height: 56,
                      style: { borderRadius: '50%', objectFit: 'cover' }
                    }
                  }
                : {
                    type: 'div',
                    props: {
                      style: {
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        backgroundColor: OGC.accent
                      }
                    }
                  },
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column', gap: '2px' },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { fontSize: 26, fontWeight: 700, color: OGC.fg },
                        children: siteTitle
                      }
                    },
                    {
                      type: 'div',
                      props: {
                        style: { fontSize: 18, fontWeight: 400, color: OGC.muted },
                        children: authorName
                      }
                    }
                  ]
                }
              }
            ]
          }
        },
        // 中部：标题 + 描述
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', gap: '20px' },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: 62,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    color: OGC.fg,
                    letterSpacing: '-1px'
                  },
                  children: cardTitle
                }
              },
              cardDesc
                ? {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        fontSize: 28,
                        fontWeight: 400,
                        lineHeight: 1.5,
                        color: OGC.muted
                      },
                      children: cardDesc
                    }
                  }
                : null
            ].filter(Boolean)
          }
        },
        // 底部：日期 + 标签 + 强调条
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between'
            },
            children: [
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column', gap: '10px' },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { fontSize: 22, fontWeight: 400, color: OGC.muted },
                        children: dateText
                      }
                    },
                    cardTags
                      ? {
                          type: 'div',
                          props: {
                            style: { fontSize: 20, fontWeight: 400, color: OGC.accent },
                            children: cardTags
                          }
                        }
                      : null
                  ].filter(Boolean)
                }
              },
              {
                type: 'div',
                props: {
                  style: {
                    width: 96,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: OGC.accent
                  }
                }
              }
            ]
          }
        }
      ]
    }
  }

  const svg = await satori(template as Parameters<typeof satori>[0], {
    width: OGC.width,
    height: OGC.height,
    fonts
  })

  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
}
