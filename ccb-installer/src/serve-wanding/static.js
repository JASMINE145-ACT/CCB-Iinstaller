import { join, extname } from 'path'
import { existsSync, readFileSync } from 'fs'
import { STATIC_DIR } from './config.js'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

export function serveStatic(pathname) {
  const safe = pathname === '/' ? '/index.html' : pathname
  const file = join(STATIC_DIR, safe.replace(/^\/+/, ''))
  if (!file.startsWith(STATIC_DIR) || !existsSync(file)) {
    return new Response('Not Found', { status: 404 })
  }
  const body = readFileSync(file)
  const type = MIME[extname(file)] || 'application/octet-stream'
  return new Response(body, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

export {}
