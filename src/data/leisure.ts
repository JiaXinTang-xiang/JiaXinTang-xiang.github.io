export interface Anime {
  title: string
  status: '在看' | '看完' | '想看'
  cover?: string
  note?: string
  progress?: string
  url?: string
}

export interface Moment {
  // 使用带时区的时间，例如 2026-09-16T20:30:00+08:00。
  date: string
  text: string
  images?: { src: string; alt: string }[]
  location?: string
}

export const anime: Anime[] = [
  {
    title: '凡人修仙传',
    status: '在看',
    cover: 'https://i0.hdslb.com/bfs/bangumi/image/19a2d01429bcba6b31791277c016e0d1aa465974.png@362w_482h_1c_!web-search-media-cover.avif',
    url: 'https://www.bilibili.com/bangumi/play/ss73957?spm_id_from=333.337.0.0'
  },
  {
    title: '记忆管理局',
    status: '在看',
    cover: 'https://i1.hdslb.com/bfs/bangumi/image/384ef5cfc3de2dcac5fda6278ba88f7036c282b9.png@660w_884h.webp',
    url: 'https://www.bilibili.com/bangumi/play/ss28747?spm_id_from=333.337.0.0'
  }
]

// 图片放在 public/images/moments/，src 写 /images/moments/文件名.jpg。
// 新动态直接加入数组，页面会按时间从新到旧排序。
// 下面是参考模板，不会显示在网页上。
// 使用时，去掉某个模板每行开头的 //，修改时间、文字和图片地址即可。
// 图片路径是占位示例，需先放入自己的图片，也可以换成 https 图片链接。
export const moments: Moment[] = [
  // ① 纯文字：随手记录一句话
  // {
  //   date: '2026-09-20T20:30:00+08:00',
  //   text: '今天终于把一直惦记的小事做完了。\n慢慢来，也是在往前走。'
  // },

  // ② 单图：一张照片 + 一句话
  // {
  //   date: '2026-09-20T18:10:00+08:00',
  //   text: '抬头的时候，刚好赶上今天的晚霞。',
  //   images: [
  //     { src: '/images/moments/sunset.jpg', alt: '傍晚天空中的晚霞' }
  //   ]
  // },

  // ③ 多图：周末、出游或生活碎片
  // {
  //   date: '2026-09-19T16:00:00+08:00',
  //   text: '周末碎片。\n走了一段路，吃了点喜欢的东西，也拍下几张照片。',
  //   images: [
  //     { src: '/images/moments/weekend-1.jpg', alt: '散步路上看到的风景' },
  //     { src: '/images/moments/weekend-2.jpg', alt: '周末吃到的美食' },
  //     { src: '/images/moments/weekend-3.jpg', alt: '路边的一家小店' }
  //   ]
  // },

  // ④ 带地点：打卡记录，图片可选
  // {
  //   date: '2026-09-18T14:20:00+08:00',
  //   text: '找个安静的角落坐一会儿，给自己放个小假。',
  //   location: '杭州 · 一家咖啡店',
  //   images: [
  //     { src: '/images/moments/coffee.jpg', alt: '窗边的咖啡和书' }
  //   ]
  // },

  // ⑤ 追番 / 学习：用文字记下当时的感受
  // {
  //   date: '2026-09-17T22:00:00+08:00',
  //   text: '《凡人修仙传》追番记录\n看到第 XX 集。\n最想记下的一幕：……\n看完的感受：……'
  // },
]
