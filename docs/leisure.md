# 追番与动态

编辑 `src/data/leisure.ts` 后重新构建、部署即可更新网站。

## 追番

在 `anime` 数组里增加条目。`status` 支持 `在看`、`看完`、`想看`；封面、进度、短评和观看链接可省略，没有封面时显示文字卡面。

```ts
{ title: '凡人修仙传', status: '在看', progress: '看到第 10 集',
  cover: '/images/anime/fanren.jpg', note: '写下自己的观后感' }
```

封面文件放在 `public/images/anime/`。

## 动态

在 `moments` 数组中增加下面这样的条目。以下只是格式示例，不会自动发布：

```ts
{
  date: '2026-09-16T20:30:00+08:00',
  text: '今天想记下的一句话。\n也可以换行。',
  images: [{ src: '/images/moments/evening.jpg', alt: '傍晚的天空' }],
  location: '杭州'
}
```

`images` 和 `location` 可省略。图片放到 `public/images/moments/`，可以添加多张；点击图片可打开原图。动态自动按时间倒序排列，统一显示北京时间。网页是展示页，发布内容通过编辑文件完成。
