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
  { title: '凡人修仙传', status: '在看' },
  { title: '记忆管理局', status: '在看' }
]

// 图片放在 public/images/moments/，src 写 /images/moments/文件名.jpg。
// 新动态直接加入数组，页面会按时间从新到旧排序。
export const moments: Moment[] = []
