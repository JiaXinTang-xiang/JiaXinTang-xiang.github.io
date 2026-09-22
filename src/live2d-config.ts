/**
 * Live2D 看板娘的前端展示配置。
 *
 * 这里只放可以公开到浏览器里的内容。API Key、system prompt 等服务端信息
 * 仍然保留在 ai-config.ts 和 API 路由中，不能移动到这里。
 */
export const live2dConfig = {
  name: '嘉心糖',
  modelPath: '/live2d/seethrough_output/seethrough_output.model3.json',
  avatar: '/images/jiaxintang-see-through-input-v3.png',

  size: {
    desktop: { width: 280, height: 380 },
    mobile: { width: 180, height: 250 }
  },

  responsive: {
    breakpoint: 767,
    /** 移动端默认折叠，只保留一个小头像按钮。 */
    defaultCollapsed: true,
    storageKey: 'jiaxintang-live2d-mobile-collapsed'
  },

  expressions: {
    neutral: '普通',
    available: ['微笑', '惊讶', '半闭眼', '嫌弃眼', '左眼眨', '右眼眨']
  },

  motions: ['Nod', 'Shake', 'Blink'],

  messages: {
    displayTime: 3200,
    greeting: '唔……你好呀，我是这个博客的看板娘嘉心糖。想聊技术、翻文章，或者随便说说话都可以～',
    click: [
      '唔……找我吗？',
      '有什么想问的都可以说哦～',
      '想翻文章的话，归档页在菜单里。',
      '诶？是想聊天还是想找东西？',
      '我一直在的，随时叫我。',
      '要记得多喝水、早点休息哦。'
    ]
  },

  chat: {
    historyLimit: 20,
    pageTextLimit: 1200
  }
} as const
