import { access, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = path.resolve(import.meta.dirname, '..')
const contentRoot = path.join(projectRoot, 'src', 'content')
const mapPath = path.join(projectRoot, '_r2-migration', 'migration-map.json')
const applyChanges = process.argv.includes('--apply')
const skipRemoteCheck = process.argv.includes('--skip-remote-check')

function toPosix(value) {
  return value.split(path.sep).join('/')
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function collectMarkdown(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdown(fullPath)))
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      files.push(fullPath)
    }
  }

  return files
}

async function verifyRemoteImages(records) {
  let index = 0
  const failures = []

  async function worker() {
    while (index < records.length) {
      const record = records[index]
      index += 1

      try {
        const response = await fetch(record.url, { method: 'HEAD', redirect: 'follow' })
        if (!response.ok) {
          failures.push(`${response.status} ${record.url}`)
        }
      } catch (error) {
        failures.push(`${record.url}: ${error instanceof Error ? error.message : error}`)
      }
    }
  }

  await Promise.all(Array.from({ length: 6 }, () => worker()))

  if (failures.length > 0) {
    throw new Error(
      `有 ${failures.length} 个远程图片尚不可访问，已停止修改：\n${failures
        .slice(0, 10)
        .join('\n')}`
    )
  }
}

await access(mapPath).catch(() => {
  throw new Error('找不到迁移映射，请先运行 node scripts/prepare-r2-migration.mjs')
})

const records = JSON.parse(await readFile(mapPath, 'utf8'))
if (applyChanges && !skipRemoteCheck) {
  console.log(`正在检查 ${records.length} 个 R2 图片 URL...`)
  await verifyRemoteImages(records)
  console.log('全部 R2 图片均可访问。')
}

const markdownFiles = await collectMarkdown(contentRoot)
const pendingWrites = []
let replacementCount = 0

for (const markdownPath of markdownFiles) {
  const original = await readFile(markdownPath, 'utf8')
  let next = original
  let fileReplacementCount = 0

  for (const record of records) {
    const sourceAbsolute = path.join(projectRoot, ...record.source.split('/'))
    const relative = toPosix(path.relative(path.dirname(markdownPath), sourceAbsolute))
    // Replace the most specific form first. Otherwise `day1.jpg` inside
    // `./day1.jpg` leaves a broken `./https://...` URL behind.
    const candidates = [...new Set([relative, relative.startsWith('.') ? relative : `./${relative}`])]
      .sort((left, right) => right.length - left.length)

    for (const candidate of candidates) {
      const pattern = new RegExp(escapeRegExp(candidate), 'g')
      const matches = next.match(pattern)?.length || 0
      if (matches > 0) {
        next = next.replace(pattern, record.url)
        fileReplacementCount += matches
      }
    }
  }

  // Repair output produced by older versions of this migration script.
  next = next.replaceAll(
    './https://picr2.jiaxin404.top/',
    'https://picr2.jiaxin404.top/'
  )

  // Astro optimizes remote Markdown images into local /_astro files.
  // Convert images previously switched to direct-R2 HTML back to Markdown.
  next = next.replace(
    /<img\s+src="(https:\/\/picr2\.jiaxin404\.top\/[^"]+)"\s+alt="([^"]*)"\s+loading="lazy"\s+decoding="async"\s*\/>/g,
    (_match, src, alt) => `![${alt}](${src})`
  )

  // Remote hero images need inferred dimensions when rendered by Astro <Image>.
  next = next.replace(
    /heroImage:\s*\{([^}\n]*src:\s*['"]https:\/\/picr2\.jiaxin404\.top\/[^}\n]*)(\})/g,
    (match, body, close) =>
      /\binferSize\s*:/.test(body)
        ? match
        : `heroImage: {${body.trimEnd()}, inferSize: true ${close}`
  )

  /*
   * 直接 R2 模式的备用处理（当前关闭）：
   * 1. 把远程 Markdown 图片改成普通 <img loading="lazy">；
   * 2. 从远程 heroImage 中移除 inferSize；
   * 3. Hero/PostPreview 组件对远程地址使用普通 <img>。
   */

  if (next !== original) {
    const relativeMarkdown = toPosix(path.relative(projectRoot, markdownPath))
    pendingWrites.push({ markdownPath, relativeMarkdown, content: next })
    replacementCount += fileReplacementCount
    console.log(`${relativeMarkdown}: ${fileReplacementCount} 个图片引用`)
  }
}

console.log(`共 ${pendingWrites.length} 篇文章、${replacementCount} 个本地图片引用需要替换。`)

if (!applyChanges) {
  console.log('当前为预览模式；上传完成后使用 --apply 才会写入文件。')
  process.exit(0)
}

for (const pending of pendingWrites) {
  await writeFile(pending.markdownPath, pending.content, 'utf8')
}

console.log('文章图片链接替换完成。本地原图仍保留，请构建和上线检查后再手工清理。')
