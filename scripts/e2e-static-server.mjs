import { randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const LISTEN_HOST = process.env.E2E_STATIC_LISTEN_HOST ?? '0.0.0.0'
const STATIC_PORT = Number(process.env.E2E_STATIC_PORT ?? 8789)
const STATIC_PROTOCOL = process.env.E2E_STATIC_PROTOCOL ?? 'http'
const STATIC_HOST = process.env.E2E_STATIC_HOST ?? 'localhost'
const BASE_URL =
  process.env.E2E_STATIC_BASE_URL ??
  `${STATIC_PROTOCOL}://${STATIC_HOST}:${STATIC_PORT}`

const STORAGE_DIR =
  process.env.E2E_STATIC_STORAGE_DIR ??
  path.join(__dirname, '..', '.e2e-static', 'uploads')

async function ensureStorage() {
  await mkdir(STORAGE_DIR, { recursive: true })
}

async function cleanStorage() {
  if (process.env.E2E_STATIC_CLEAN !== '0') {
    await rm(STORAGE_DIR, { recursive: true, force: true })
  }
  await ensureStorage()
}

function sendJSON(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
  })
  res.end(JSON.stringify(payload))
}

async function saveFile(buffer, ext) {
  const subDir = path.join(
    STORAGE_DIR,
    new Date().toISOString().slice(0, 10).replace(/-/g, '')
  )
  await mkdir(subDir, { recursive: true })
  const filename = `${Date.now()}-${randomUUID()}${ext ? `.${ext}` : ''}`
  const filePath = path.join(subDir, filename)
  await writeFile(filePath, buffer)
  const relative = path
    .relative(STORAGE_DIR, filePath)
    .split(path.sep)
    .join('/')
  return { filePath, relativePath: relative }
}

function serveFile(res, filepath) {
  const stream = createReadStream(filepath)
  stream.on('open', () => {
    const type = mime.lookup(filepath) || 'application/octet-stream'
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    })
  })
  stream.on('error', () => {
    res.statusCode = 404
    res.end('Not Found')
  })
  stream.pipe(res)
}

const MIME_EXTENSION_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg',
}

function extractBoundary(headers) {
  const contentType = headers['content-type']
  if (!contentType) {
    return null
  }
  const match = contentType.match(/boundary=(.+)$/)
  if (!match) {
    return null
  }
  return match[1]
}

function parseMultipartBody(buffer, boundary) {
  const delimiter = Buffer.from(`--${boundary}`)
  const closeDelimiter = Buffer.from(`--${boundary}--`)
  const doubleCrlf = Buffer.from('\r\n\r\n')

  let start = buffer.indexOf(delimiter)
  if (start === -1) {
    return null
  }
  start += delimiter.length + 2 // skip delimiter + CRLF

  let end = buffer.indexOf(delimiter, start)
  if (end === -1) {
    end = buffer.indexOf(closeDelimiter, start)
  }
  if (end === -1) {
    return null
  }

  // Trim trailing CRLF before the next boundary
  const part = buffer.subarray(start, end - 2)
  const headerEnd = part.indexOf(doubleCrlf)
  if (headerEnd === -1) {
    return null
  }
  const headerRaw = part.subarray(0, headerEnd).toString('utf8')
  const body = part.subarray(headerEnd + doubleCrlf.length)

  const mimeMatch = headerRaw
    .split(/\r?\n/)
    .map((line) => line.toLowerCase())
    .find((line) => line.startsWith('content-type'))
  const mimeType = mimeMatch?.split(':')[1]?.trim() || 'application/octet-stream'

  return { buffer: body, mimeType }
}

async function handleUpload(req, res) {
  const boundary = extractBoundary(req.headers)
  if (!boundary) {
    sendJSON(res, 400, {
      success: false,
      error: 'missing multipart boundary',
    })
    return
  }

  const chunks = []
  req.on('data', (chunk) => chunks.push(chunk))
  req.on('end', async () => {
    if (!chunks.length) {
      sendJSON(res, 400, { success: false, error: 'file missing' })
      return
    }

    const buffer = Buffer.concat(chunks)
    const parsed = parseMultipartBody(buffer, boundary)
    if (!parsed) {
      sendJSON(res, 400, { success: false, error: 'invalid payload' })
      return
    }

    const ext =
      MIME_EXTENSION_MAP[parsed.mimeType] || parsed.mimeType.split('/')[1] || 'bin'
    const { relativePath } = await saveFile(parsed.buffer, ext)
    const customUrl = `${BASE_URL}/uploads/${relativePath}`
    sendJSON(res, 200, { success: true, data: { customUrl } })
  })
}

async function start() {
  await cleanStorage()
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `${BASE_URL}`)

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': '*',
      })
      res.end()
      return
    }

    if (req.method === 'POST' && url.pathname === '/upload') {
      void handleUpload(req, res)
      return
    }

    if (req.method === 'GET' && url.pathname.startsWith('/uploads/')) {
      const relative = decodeURIComponent(
        url.pathname.replace(/^\/uploads\//, '')
      )
      const filePath = path.join(STORAGE_DIR, relative)
      serveFile(res, filePath)
      return
    }

    if (req.method === 'GET' && url.pathname === '/healthz') {
      sendJSON(res, 200, { ok: true })
      return
    }

    res.statusCode = 404
    res.end('Not Found')
  })

  server.listen(STATIC_PORT, LISTEN_HOST, () => {
    console.log(
      `[static-server] listening on ${LISTEN_HOST}:${STATIC_PORT} (public ${BASE_URL}) storage=${STORAGE_DIR}`
    )
  })

  const shutdown = () => {
    server.close(() => {
      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch((err) => {
  console.error('[static-server] failed to start:', err)
  process.exit(1)
})
