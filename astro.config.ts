import { rehypeHeadingIds } from '@astrojs/markdown-remark'
import vercel from '@astrojs/vercel'
import AstroPureIntegration from 'astro-pure'
import { defineConfig, fontProviders } from 'astro/config'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'

// Local integrations
import rehypeAutolinkHeadings from './src/plugins/rehype-auto-link-headings.ts'
import rehypeFigure from './src/plugins/rehype-figure.ts'
// Post meta (reading time & excerpt)
import { remarkExcerpt, remarkReadingTime } from './src/plugins/remark-post-meta.ts'
// Mermaid diagrams
import { remarkMermaid } from './src/plugins/remark-mermaid.ts'// Shiki
import {
  addCollapse,
  addCopyButton,
  addLanguage,
  addTitle,
  updateStyle
} from './src/plugins/shiki-custom-transformers.ts'
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerRemoveNotationEscape
} from './src/plugins/shiki-official/transformers.ts'
import config from './src/site.config.ts'

// https://astro.build/config
export default defineConfig({
  // [Basic]
  site: 'https://jiaxin404.top',
  base: '/',
  trailingSlash: 'always',
  // root: './my-project-directory',
  server: { host: true },

  // [Adapter]
  // https://docs.astro.build/en/guides/deploy/
  adapter: vercel(),
  output: 'static',
  // Local (standalone)
  // adapter: node({ mode: 'standalone' }),
  // output: 'server',

  // [Assets]
  image: {
    responsiveStyles: true,
    service: {
      entrypoint: 'astro/assets/services/sharp'
    },
    // Allow remote images for GitHub chart
    domains: ['ghchart.rshah.org'],
    remotePatterns: [
      { protocol: 'https', hostname: 'ghchart.rshah.org' }
    ]
  },

  // [Markdown]
  markdown: {
    // remarkMermaid 把 ```mermaid 代码块换成 .mermaid 容器（必须早于 Shiki）
    remarkPlugins: [remarkMath, remarkReadingTime, remarkExcerpt, remarkMermaid],
    rehypePlugins: [
      [rehypeKatex, {}],
      rehypeHeadingIds,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: { className: ['anchor'] },
          content: { type: 'text', value: '#' }
        }
      ],
      rehypeFigure()
    ],
    // https://docs.astro.build/en/guides/syntax-highlighting/
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      },
      transformers: [
        // Two copies of @shikijs/types (one under node_modules
        // and another nested under @astrojs/markdown-remark → shiki).
        // Official transformers
        // @ts-ignore this happens due to multiple versions of shiki types
        transformerNotationDiff(),
        // @ts-ignore this happens due to multiple versions of shiki types
        transformerNotationHighlight(),
        // @ts-ignore this happens due to multiple versions of shiki types
        transformerRemoveNotationEscape(),
        // Custom transformers
        // @ts-ignore this happens due to multiple versions of shiki types
        updateStyle(),
        // @ts-ignore this happens due to multiple versions of shiki types
        addTitle(),
        // @ts-ignore this happens due to multiple versions of shiki types
        addLanguage(),
        // @ts-ignore this happens due to multiple versions of shiki types
        addCopyButton(2000), // timeout in ms
        // @ts-ignore this happens due to multiple versions of shiki types
        addCollapse(15) // max lines that needs to collapse
      ]
    }
  },

  // [Integrations]
  integrations: [
    // astro-pure will automatically add sitemap, mdx & unocss
    // sitemap(),
    // mdx(),
    AstroPureIntegration(config)
  ],

  // [Experimental]
  experimental: {
    // Allow compatible editors to support intellisense features for content collection entries
    // https://docs.astro.build/en/reference/experimental-flags/content-intellisense/
    contentIntellisense: true,
    // Enable SVGO optimization for SVG assets
    // https://docs.astro.build/en/reference/experimental-flags/svg-optimization/
    svgo: true,
    // Enable font preloading and optimization
    // https://docs.astro.build/en/reference/experimental-flags/fonts/
    fonts: [
      {
        provider: fontProviders.fontshare(),
        name: 'Satoshi',
        cssVariable: '--font-satoshi',
        // Default included:
        // weights: [400],
        // styles: ["normal", "italics"],
        // subsets: ["cyrillic-ext", "cyrillic", "greek-ext", "greek", "vietnamese", "latin-ext", "latin"],
        // fallbacks: ["sans-serif"],
        styles: ['normal', 'italic'],
        weights: [400, 500],
        subsets: ['latin']
      }
    ]
  }
})
