欢迎来我的[主页](https://jiaxin404.top/) ~
## Umami 访问统计

在 Umami 创建网站后，将下面两个环境变量配置到本地 `.env` 和部署平台：

```env
PUBLIC_UMAMI_SCRIPT_URL=https://你的-umami-地址/script.js
PUBLIC_UMAMI_WEBSITE_ID=你的-website-id
```

Umami 脚本只在两个变量都存在时加载；`data-do-not-track="true"` 会尊重访客的浏览器免跟踪设置。
