import { redirects } from '../../vercel.json'

const withSlash = (path: string) => (path === '/' ? '/' : `${path.replace(/\/+$/, '')}/`)

/** Keep old article addresses and trailing-slash variants in the same thread. */
export function walinePath(path: string): string {
  const normalized = withSlash(path)
  const redirect = redirects.find(({ source }) => withSlash(source) === normalized)
  return redirect ? withSlash(redirect.destination) : normalized
}

export function walinePaths(path: string): string[] {
  const canonical = walinePath(path)
  const paths = new Set([canonical])
  if (canonical !== '/') paths.add(canonical.slice(0, -1))

  for (const { source, destination } of redirects) {
    if (withSlash(destination) !== canonical) continue
    paths.add(withSlash(source))
    paths.add(withSlash(source).slice(0, -1))
  }

  return [...paths]
}
