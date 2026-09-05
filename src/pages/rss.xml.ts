import type { AstroGlobal, ImageMetadata } from 'astro'
import { getImage } from 'astro:assets'
import { getCollection, type CollectionEntry } from 'astro:content'
import rss from '@astrojs/rss'
import type { Root } from 'mdast'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

import { sortMDByDate } from 'astro-pure/server'
import config from 'virtual:config'

// Get dynamic import of images as a map collection
const imagesGlob = import.meta.glob<{ default: ImageMetadata }>(
  '/src/content/**/*.{jpeg,jpg,png,gif,avif,webp}' // add more image formats if needed
)

type FeedCollection = 'blog' | 'tech' | 'daily'
type FeedEntry = CollectionEntry<FeedCollection>

// Only publish these selected technical articles to the public blog feed.
// Add another slug here when you want BlogsClub and other readers to receive it.
const rssWhitelist = new Set([
  'About-Ubuntu-command',
  'about-my-blog',
  'use-git',
  'about_me_git',
  'waline_jia',
  'camera-calibration',
  'about-my-notes',
  'maix_yolo'
])

const renderContent = async (post: FeedEntry, site: URL) => {
  // Replace image links with the correct path
  function remarkReplaceImageLink() {
    /**
     * @param {Root} tree
     */
    return async (tree: Root) => {
      const promises: Promise<void>[] = []
      visit(tree, 'image', (node) => {
        if (node.url.startsWith('/images')) {
          node.url = `${site}${node.url.replace('/', '')}`
        } else {
          const imagePathPrefix = `/src/content/${post.collection}/${post.id}/${node.url.replace('./', '')}`
          const promise = imagesGlob[imagePathPrefix]?.().then(async (res) => {
            const imagePath = res?.default
            if (imagePath) {
              node.url = `${site}${(await getImage({ src: imagePath })).src.replace('/', '')}`
            }
          })
          if (promise) promises.push(promise)
        }
      })
      await Promise.all(promises)
    }
  }

  const file = await unified()
    .use(remarkParse)
    .use(remarkReplaceImageLink)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(post.body)

  return String(file)
}

const GET = async (context: AstroGlobal) => {
  const allPostsByDate = sortMDByDate(
    (
      await Promise.all(
        (['blog', 'tech', 'daily'] as FeedCollection[]).map((collection) =>
          getCollection(collection, ({ data }) => !data.draft)
        )
      )
    ).flat()
  ) as FeedEntry[]
  const feedPosts = allPostsByDate.filter(
    (post) => post.collection === 'tech' && rssWhitelist.has(post.id)
  )
  const siteUrl = context.site ?? new URL(import.meta.env.SITE)

  return rss({
    // Basic configs
    trailingSlash: false,
    xmlns: {
      h: 'http://www.w3.org/TR/html4/',
      atom: 'http://www.w3.org/2005/Atom',
      dc: 'http://purl.org/dc/elements/1.1/',
      itunes: 'http://www.itunes.com/dtds/podcast-1.0.dtd'
    },
    stylesheet: '/scripts/pretty-feed-v3.xsl',

    // Contents
    title: config.title,
    description: config.description,
    site: import.meta.env.SITE,
    customData: `<language>${config.locale.lang}</language>
      <copyright>Copyright © ${new Date().getFullYear()} ${config.author}</copyright>
      <managingEditor>${config.author} (${import.meta.env.SITE})</managingEditor>
      <webMaster>${import.meta.env.SITE}</webMaster>
      <image>
        <url>${new URL('/images/avatar.jpg', import.meta.env.SITE).href}</url>
        <title>${config.title}</title>
        <link>${import.meta.env.SITE}</link>
      </image>
      <dc:creator>${config.author}</dc:creator>
      <itunes:author>${config.author}</itunes:author>
      <itunes:summary>${config.description}</itunes:summary>`,
    items: await Promise.all(
      feedPosts.map(async (post) => ({
        pubDate: post.data.publishDate,
        content: await renderContent(post, siteUrl),
        ...post.data,
        customData: `${post.data.heroImage?.src ? `<h:img src="${typeof post.data.heroImage.src === 'string' ? post.data.heroImage.src : post.data.heroImage.src.src}" />
          <enclosure url="${typeof post.data.heroImage.src === 'string' ? post.data.heroImage.src : post.data.heroImage.src.src}" />` : ''}
          <dc:creator>${config.author}</dc:creator>
          <author>${config.author}</author>`,
        link: `/${post.collection === 'blog' ? 'blog' : post.collection}/${post.id}`
      }))
    )
  })
}

export { GET }
