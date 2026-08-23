import type { CardListData, Config, IntegrationUserConfig, ThemeUserConfig } from 'astro-pure/types'

export const theme: ThemeUserConfig = {
  // [Basic]
  /** Title for your website. Will be used in metadata and as browser tab title. */
  title: 'JiaXin‘s Blog',
  /** Will be used in index page & copyright declaration */
  author: '嘉心糖',
  /** Description metadata for your website. Can be used in page metadata. */
  description: '分享一些技术思考和记录成长的点滴',
  /** The default favicon for your site which should be a path to an image in the `public/` directory. */
  favicon: '/favicon/favicon.ico',
  /** The default social card image for your site which should be a path to an image in the `public/` directory. */
  socialCard: '/images/social-card.jpg',
  /** Specify the default language for this site. */
  locale: {
    lang: 'zh-CN',
    attrs: 'zh_CN',
    // Date locale
    dateLocale: 'zh-CN',
    dateOptions: {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }
  },
  /** Set a logo image to show in the homepage. */
  logo: {
    src: '/src/assets/head.jpg',
    alt: 'Avatar'
  },
  //建议：保持现状
  titleDelimiter: '•',  //网站页面标题中各部分之间的分隔符  
  prerender: true, // pagefind search is not supported with prerendering disabled
  npmCDN: 'https://cdn.jsdelivr.net/npm',   //依赖第三方库时用的 CDN 源

  // Still in test  这是用来在 HTML 的 <head> 标签中添加自定义元数据或标签的
  head: [
    /* Telegram channel */
    // {
    //   tag: 'meta',
    //   attrs: { name: 'telegram:channel', content: '@cworld0_cn' },
    //   content: ''
    // },
    // 百度统计
    // {
    //   tag: 'script',
    //   attrs: { src: 'https://hm.baidu.com/hm.js?your_baidu_code' },
    //   content: ''
    // }
  ],
  customCss: [],

  /** Configure the header of your site. */
  header: {

    menu: [
      {
        title: 'Blog',
        link: '/blog',
        submenu: [
          { title: 'Tech', link: '/tech' },
          { title: 'Daily', link: '/daily' },
          { title: 'Monthly', link: '/monthly' },
          { title: 'Notes', link: 'https://notes.jiaxin404.top/' },
          { title: 'Wiki', link: 'https://jiaxin404.feishu.cn/wiki/CZdpwGVZiiv9JQknRa6cSHkjnUf' }
        ]
      },
      { title: 'Projects', link: '/projects' },
      { title: 'Links', link: '/links' },
      { title: 'About', link: '/about' },
      { title: 'Update', link: '/update' }
    ]
  },


  /** Configure the footer of your site. */
  footer: {
    // Year format  年份格式
    year: `© ${new Date().getFullYear()}`,
    // year: `© 2024 - ${new Date().getFullYear()}`,
    links: [
      // Registration link  真实的 ICP 备案信息
      {
        title: 'Moe ICP 114514',
        link: 'https://icp.gov.moe/?keyword=114514',
        style: 'text-sm' // Uno/TW CSS class
      },
      // Privacy Policy link  隐私政策和使用条款链接
      {
        title: 'Site Policy',
        link: '/terms',
        pos: 2 // position set to 2 will be appended to copyright line
      }
    ],
    /** Enable displaying a “Astro & Pure theme powered” link in your site’s footer. */
    credits: true,    //这是对主题作者的尊重
    /** Optional details about the social media accounts for this site. */
    social: {
      github: 'https://github.com/jiaxintang-xiang',
      email: 'mailto:2174064279@qq.com',
      // 可以添加更多社交链接
      // twitter: 'https://twitter.com/yourusername',
      // weibo: 'https://weibo.com/yourusername',
      // bilibili: 'https://space.bilibili.com/yourid'
    }
  },
  
  // [Content]
  content: {
    /** External links configuration  外部链接配置*/ 
    externalLinks: {
      content: ' ↗',   //提示用户这是外部链接（会跳转到其他网站）
      /** Properties for the external links element */
      properties: {
        style: 'user-select:none'
      }
    },
    /** Blog page size for pagination (optional) */
    blogPageSize: 8,
    // Currently support weibo, x, bluesky 社交分享按钮
    share: ['weibo', 'x', 'bluesky']  
  }
}

export const integ: IntegrationUserConfig = {
  // [Links]
  // https://astro-pure.js.org/docs/integrations/links
  links: {
    // Friend logbook
      logbook: [],  // 不注释，给空数组
    // logbook: [
    //   { date: '2025-03-30', content: '开始完善个人博客，记录技术成长之路' },
    //   { date: '2025-03-29', content: '学习 Astro 框架，体验现代前端开发的魅力' },
    //   { date: '2025-03-28', content: '配置 GitHub Pages 自动部署，让分享变得更简单' },
    //   { date: '2025-03-27', content: '思考博客的定位：不仅是技术分享，更是生活记录' },
    //   { date: '2025-03-26', content: '每一个项目都是成长的见证，每一篇文章都是思考的结晶' }
    // ],
    // Yourself link info
    
    applyTip: [
      { name: 'Name', val: `JiaXin's Blog` },
      { name: 'Desc', val: '心有山海，静而无边' },
      { name: 'Link', val: 'https://jiaxin404.top/' },
      { name: 'Avatar', val: 'https://jiaxin404.top/images/avatar.jpg' }
    ],
    // Cache avatars in `public/avatars/` to improve user experience.
    cacheAvatar: false
  },
  // [Search]
  pagefind: true,
  // Add a random quote to the footer (default on homepage footer)
  // See: https://astro-pure.js.org/docs/integrations/advanced#web-content-render
  // [Quote]
  quote: {
    // 固定显示你喜欢的名言
    server: 'data:text/plain,追风赶月莫停留，平芜尽处是青山',
    target: `(data) => '追风赶月莫停留，平芜尽处是青山。'`
  },
  // [Typography]
  // https://unocss.dev/presets/typography
  typography: {
    class: 'prose text-base',
    // The style of blockquote font `normal` / `italic` (default to italic in typography)
    blockquoteStyle: 'italic',
    // The style of inline code block `code` / `modern` (default to code in typography)
    inlineCodeBlockStyle: 'modern'
  },
  // [Lightbox]
  // A lightbox library that can add zoom effect
  // https://astro-pure.js.org/docs/integrations/others#medium-zoom
  mediumZoom: {
    enable: true, // disable it will not load the whole library
    selector: '.prose .zoomable',
    options: {
      className: 'zoomable'
    }
  },
  // Comment system
  waline: {
    enable: true,
    // Server service link
    server: 'https://waline.jiaxin404.top',
    // Show meta info for comments
    showMeta: false,
    // Refer https://waline.js.org/en/guide/features/emoji.html
    emoji: ['bilibili', 'weibo'],
    // Refer https://waline.js.org/en/reference/client/props.html
    additionalConfigs: {
      // search: false,
      pageview: true,
      comment: true,
      locale: {
        reaction0: '点赞',
        placeholder: '欢迎评论！(留下邮箱可以收到回复通知，无需登录)',
        timeAgo: true,
        locale: {
          nick: '昵称',
          mail: '邮箱',
          link: '网站',
          optional: '可选',
          placeholder: '欢迎评论！支持 Markdown 语法',
          sofa: '还没有评论，快来抢沙发吧！',
          submit: '提交',
          reply: '回复',
          cancel: '取消',
          confirm: '确认',
          cancelReply: '取消回复',
          comments: '评论',
          refresh: '刷新',
          more: '加载更多...',
          preview: '预览',
          emoji: '表情',
          expand: '展开',
          seconds: '秒前',
          minutes: '分钟前',
          hours: '小时前',
          days: '天前',
          now: '刚刚'
        }
      },
      imageUploader: false
    }
  }
}

export const terms: CardListData = {
  title: 'Terms content',
  list: [
    {
      title: 'Privacy Policy',
      link: '/terms/privacy-policy'
    },
    {
      title: 'Terms and Conditions',
      link: '/terms/terms-and-conditions'
    },
    {
      title: 'Copyright',
      link: '/terms/copyright'
    },
    {
      title: 'Disclaimer',
      link: '/terms/disclaimer'
    }
  ]
}

const config = { ...theme, integ } as Config
export default config
