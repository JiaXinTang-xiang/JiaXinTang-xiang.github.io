// Import the real file so the Vite alias for @waline/api does not recurse.
import * as api from '../../node_modules/@waline/api/dist/api.js'
import { walinePath, walinePaths } from './waline-paths'

export * from '../../node_modules/@waline/api/dist/api.js'

type CommentOptions = Parameters<typeof api.getComment>[0]
type CommentPage = Awaited<ReturnType<typeof api.getComment>>
type RootComment = CommentPage['data'][number]

// Replies must stay on their parent's stored path, including historic paths.
const threadPaths = new Map<number, string>()

async function readThread(options: CommentOptions): Promise<CommentPage> {
  const first = await api.getComment({ ...options, page: 1, pageSize: 100 })
  const data = [...first.data]
  for (let page = 2; page <= first.totalPages; page++) {
    const next = await api.getComment({ ...options, page, pageSize: 100 })
    data.push(...next.data)
  }
  for (const root of data) {
    threadPaths.set(root.objectId, options.path)
    for (const child of root.children) threadPaths.set(child.objectId, options.path)
  }
  return { ...first, data }
}

/** Merge all historic threads before sorting and paginating. */
export const getComment: typeof api.getComment = async (options) => {
  const pages = await Promise.all(
    walinePaths(options.path).map((path) => readThread({ ...options, path }))
  )
  const roots = new Map<number, RootComment>()
  for (const page of pages) {
    for (const root of page.data) roots.set(root.objectId, root)
  }

  const data = [...roots.values()].sort((a, b) => {
    if (Boolean(a.sticky) !== Boolean(b.sticky)) return a.sticky ? -1 : 1
    if (options.sortBy === 'insertedAt_asc') return a.time - b.time
    if (options.sortBy === 'like_desc') return b.like - a.like || b.time - a.time
    return b.time - a.time
  })
  const ids = new Set<number>()
  for (const root of data) {
    ids.add(root.objectId)
    for (const child of root.children) ids.add(child.objectId)
  }
  const offset = (options.page - 1) * options.pageSize
  return {
    page: options.page,
    pageSize: options.pageSize,
    totalPages: Math.ceil(data.length / options.pageSize),
    count: ids.size,
    data: data.slice(offset, offset + options.pageSize)
  }
}

export const addComment: typeof api.addComment = async (options) => {
  const { comment } = options
  const parent = comment.rid || comment.pid
  const path = (parent && threadPaths.get(parent)) || walinePath(comment.url)
  const response = await api.addComment({ ...options, comment: { ...comment, url: path } })
  if (!response.errno && response.data) threadPaths.set(response.data.objectId, path)
  return response
}

export const fetchCommentCount: typeof api.fetchCommentCount = async (options) => {
  const groups = options.paths.map(walinePaths)
  const paths = [...new Set(groups.flat())]
  const counts = await api.fetchCommentCount({ ...options, paths })
  const byPath = new Map(paths.map((path, index) => [path, counts[index] || 0]))
  return groups.map((group) => group.reduce((sum, path) => sum + (byPath.get(path) || 0), 0))
}
