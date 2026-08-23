export const translations = {
  zh: {
    // 导航栏
    'nav.blog': '博客',
    'nav.blog.tech': '技术',
    'nav.blog.daily': '日常',
    'nav.blog.monthly': '月记',
    'nav.blog.notes': '笔记',
    'nav.projects': '项目',
    'nav.links': '友链',
    'nav.about': '关于我',
    'nav.update': '归档',
    'nav.travellings': '旅行',

    // 首页
    'home.about': '关于',
    'home.education': '教育',
    'home.posts': '文章',
    'home.projects': '项目',
    'home.skills': '技能',
    'home.statistics': '统计',

    // 按钮
    'btn.learn_more': '了解更多',
    'btn.read_more': '查看更多文章',
    'btn.checkout': '查看赞助',

    // 统计
    'stats.days_online': '在线天数',
    'stats.last_updated': '最后更新',
    'stats.total_words': '总字数',
    'stats.total_posts': '文章总数',

    // 技能
    'skill.languages': '编程语言',
    'skill.frontend': '前端技术',
    'skill.backend': '后端工具',

    // 友链
    'links.common': '友情链接',
    'links.apply': '申请友链',
    'links.apply_desc': '可通过下方留言或提交 PR 申请友链。',

    // 项目
    'projects.title': '项目',
    'projects.sponsorship': '赞助',

    // 通用
    'common.search': '搜索',
    'common.back': '返回',
  },
  en: {
    // Nav
    'nav.blog': 'Blog',
    'nav.blog.tech': 'Tech',
    'nav.blog.daily': 'Daily',
    'nav.blog.monthly': 'Monthly',
    'nav.blog.notes': 'Notes',
    'nav.projects': 'Projects',
    'nav.links': 'Links',
    'nav.about': 'About',
    'nav.update': 'Archive',
    'nav.travellings': 'Travelling',

    // Home
    'home.about': 'About',
    'home.education': 'Education',
    'home.posts': 'Posts',
    'home.projects': 'Projects',
    'home.skills': 'Skills',
    'home.statistics': 'Statistics',

    // Buttons
    'btn.learn_more': 'Learn more',
    'btn.read_more': 'Read more articles',
    'btn.checkout': 'Checkout sponsorship',

    // Stats
    'stats.days_online': 'Days Online',
    'stats.last_updated': 'Last Updated',
    'stats.total_words': 'Total Words',
    'stats.total_posts': 'Total Posts',

    // Skills
    'skill.languages': 'Programming Languages',
    'skill.frontend': 'Frontend Technologies',
    'skill.backend': 'Backend Tools',

    // Links
    'links.common': 'Common Links',
    'links.apply': 'Apply Links',
    'links.apply_desc': 'Apply via comment or submitting a PR.',

    // Projects
    'projects.title': 'Projects',
    'projects.sponsorship': 'Sponsorship',

    // Common
    'common.search': 'Search',
    'common.back': 'Back',
  }
} as const

export type Lang = keyof typeof translations
export type TranslationKey = keyof typeof translations['zh']
