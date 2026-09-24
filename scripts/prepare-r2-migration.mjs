import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const projectRoot = path.resolve(import.meta.dirname, '..')
const contentRoot = path.join(projectRoot, 'src', 'content')
const outputRoot = path.join(projectRoot, '_r2-migration')
const uploadRoot = path.join(outputRoot, 'upload')
const publicBase = 'https://picr2.jiaxin404.top/posts'
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif'])

const semanticNames = new Map([
  ['tech/blog-build/images/about-my-notes/1.png', 'vercel-import-repository'],
  ['tech/blog-build/images/about-my-notes/2.png', 'vercel-deploy-settings'],
  ['tech/blog-build/images/about-my-notes/3.png', 'vercel-production-deployment'],
  ['tech/blog-build/images/about-my-notes/4.png', 'namesilo-domain-search'],
  ['tech/blog-build/images/about-my-notes/5.png', 'cloudflare-dns-records'],
  ['tech/blog-build/images/about-my-notes/6.png', 'vercel-domain-status'],
  ['tech/blog-build/images/about-my-notes/7.png', 'cloudflare-dns-overview'],
  ['tech/blog-build/images/live2d_watchgirl/image.png', 'sunset-track-standing'],
  ['tech/blog-build/images/live2d_watchgirl/image1.png', 'sunset-track-walking'],
  ['tech/tools/images/deepseek-harness/dsh.jpg', 'deepseek-harness-theme'],
  ['tech/vision/images/camera_calibration/1.png', 'chessboard-pattern'],
  ['monthly/picture/26_05/tuanjian26.png', 'team-building'],
  ['monthly/picture/26_05/xiaosai_car.png', 'campus-competition-car'],
  ['monthly/picture/26_05/gaoxiaosai.png', 'university-competition'],
  ['monthly/picture/26_07/hezhao.png', 'group-photo'],
])

function toPosix(value) {
  return value.split(path.sep).join('/')
}

function normalizeSlug(value) {
  return value.replace(/_/g, '-').toLowerCase()
}

function getTargetDirectory(relativePath) {
  const parts = relativePath.split('/')

  if (parts[0] === 'tech') {
    const category = parts[1]
    const imageDirectoryIndex = parts.indexOf('images')
    const articleDirectory = parts[imageDirectoryIndex + 1]
    return `tech/${category}/${normalizeSlug(articleDirectory)}`
  }

  if (parts[0] === 'monthly') {
    const month = parts[2].replace('_', '-')
    return `monthly/20${month}`
  }

  if (parts[0] === 'daily') {
    return 'daily/first-daily-post'
  }

  return normalizeSlug(path.posix.dirname(relativePath))
}

function getSemanticName(relativePath, targetDirectory) {
  const mapped = semanticNames.get(relativePath)
  if (mapped) return mapped

  const stem = path.posix.basename(relativePath, path.posix.extname(relativePath))
  if (stem === 'cover' || /^\d{2}-\d{2}$/.test(stem) || stem === 'day1') {
    const articleSlug = targetDirectory.split('/').pop()
    return `${articleSlug}-cover`
  }

  return normalizeSlug(stem)
}

async function collectImages(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectImages(fullPath)))
    } else if (imageExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath)
    }
  }

  return files
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`
}

await rm(outputRoot, { recursive: true, force: true })
await mkdir(uploadRoot, { recursive: true })

const sourceFiles = (await collectImages(contentRoot)).sort()
const records = []

for (const sourcePath of sourceFiles) {
  const relativePath = toPosix(path.relative(contentRoot, sourcePath))
  const targetDirectory = getTargetDirectory(relativePath)
  const semanticName = getSemanticName(relativePath, targetDirectory)
  const sourceBuffer = await readFile(sourcePath)
  const outputBuffer = await sharp(sourceBuffer)
    .rotate()
    .webp({ quality: 82, effort: 5 })
    .toBuffer()
  const hash = createHash('sha256').update(outputBuffer).digest('hex').slice(0, 8)
  const targetName = `${semanticName}-${hash}.webp`
  const objectKey = `posts/${targetDirectory}/${targetName}`
  const uploadRelativePath = `${targetDirectory}/${targetName}`
  const destinationPath = path.join(uploadRoot, ...uploadRelativePath.split('/'))

  await mkdir(path.dirname(destinationPath), { recursive: true })
  await writeFile(destinationPath, outputBuffer)

  records.push({
    source: `src/content/${relativePath}`,
    uploadRelativePath,
    objectKey,
    url: `${publicBase}/${targetDirectory}/${targetName}`,
    sourceBytes: sourceBuffer.length,
    outputBytes: outputBuffer.length,
  })
}

const csvHeader = [
  'source',
  'upload_relative_path',
  'r2_object_key',
  'public_url',
  'source_bytes',
  'webp_bytes',
]
const csvRows = records.map((record) =>
  [
    record.source,
    record.uploadRelativePath,
    record.objectKey,
    record.url,
    record.sourceBytes,
    record.outputBytes,
  ]
    .map(csvCell)
    .join(',')
)
await writeFile(
  path.join(outputRoot, 'migration-map.csv'),
  `${csvHeader.join(',')}\n${csvRows.join('\n')}\n`,
  'utf8'
)
await writeFile(
  path.join(outputRoot, 'migration-map.json'),
  `${JSON.stringify(records, null, 2)}\n`,
  'utf8'
)

const totalSourceBytes = records.reduce((sum, record) => sum + record.sourceBytes, 0)
const totalOutputBytes = records.reduce((sum, record) => sum + record.outputBytes, 0)
const markdown = `# R2 图片迁移包

生成时间：${new Date().toISOString()}

- 图片数量：${records.length}
- 原始体积：${(totalSourceBytes / 1024 / 1024).toFixed(2)} MB
- WebP 体积：${(totalOutputBytes / 1024 / 1024).toFixed(2)} MB
- R2 公共前缀：${publicBase}

封面统一使用“文章 slug + cover + 内容哈希”，例如：

- \`about-my-notes-cover-74abf210.webp\`
- \`camera-calibration-cover-2725cefd.webp\`
- \`2026-04-cover-aa3abf06.webp\`

## 上传方法

1. 打开新版 Lightframe 上传页面。
2. 目标目录填写 \`posts\`。
3. 命名方式选择“保留原名”。
4. 关闭“WebP 压缩”（迁移包已经压缩并带内容哈希）。
5. 点击“选择文件夹”，选择 \`_r2-migration/upload\`。
6. 检查待上传路径后点击“开始上传”。

最外层 \`upload\` 会被忽略，最终对象路径会从 \`posts/tech/...\`、\`posts/monthly/...\` 开始。

## 迁移原则

- 当前仅包含 \`src/content\` 下的文章图片与封面。
- 未包含友链图片、头像、favicon、Live2D 模型贴图、二维码和项目卡片。
- 原文件没有删除，文章引用也没有修改；上传并核验完成后再替换链接。

完整映射见 \`migration-map.csv\` 和 \`migration-map.json\`。上传完成后先运行：

\`node scripts/apply-r2-migration.mjs\`

它只会预览将要修改的文章。确认无误后运行：

\`node scripts/apply-r2-migration.mjs --apply\`

实际修改前脚本会验证全部 R2 图片 URL；默认不会删除任何本地原图。
`
await writeFile(path.join(outputRoot, 'README.md'), markdown, 'utf8')

console.log(`Prepared ${records.length} images in ${uploadRoot}`)
console.log(
  `${(totalSourceBytes / 1024 / 1024).toFixed(2)} MB -> ${(totalOutputBytes / 1024 / 1024).toFixed(2)} MB`
)
