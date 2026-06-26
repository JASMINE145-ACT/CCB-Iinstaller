export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} body
   */
  constructor(status, body) {
    super(status === 0 ? body : `API ${status}: ${body}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * @typedef {Object} AnthropicTool
 * @property {string} name
 * @property {string} description
 * @property {object} input_schema
 */

/**
 * @param {AbortSignal | undefined} signal
 */
function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw Object.assign(new Error('Aborted'), { name: 'AbortError' })
  }
}

/**
 * @param {AbortSignal | undefined} external
 * @param {number} timeoutMs
 * @returns {{ signal: AbortSignal, cleanup: () => void }}
 */
function linkAbortSignal(external, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  if (external) {
    if (external.aborted) {
      clearTimeout(timer)
      controller.abort()
    } else {
      external.addEventListener('abort', () => controller.abort(), { once: true })
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  }
}

/**
 * @param {import('./index.js').ApiCallInput} input
 * @returns {Promise<import('./index.js').ApiCallOutput>}
 */
export async function callApiSync(input) {
  const {
    apiBase,
    apiKey,
    model,
    maxTokens,
    system,
    messages,
    tools,
    signal,
    timeoutMs = 30000,
  } = input

  throwIfAborted(signal)

  const url = `${apiBase.replace(/\/$/, '')}/v1/messages`
  const body = {
    model,
    max_tokens: maxTokens,
    stream: false,
    messages,
    ...(system ? { system } : {}),
    ...(tools?.length ? { tools } : {}),
  }

  const { signal: fetchSignal, cleanup } = linkAbortSignal(signal, timeoutMs)

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: fetchSignal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw Object.assign(new Error(err.message || 'Aborted'), { name: 'AbortError' })
    }
    throw err
  } finally {
    cleanup()
  }

  const text = await res.text().catch(() => '')
  if (!res.ok) {
    throw new ApiError(res.status, text.slice(0, 300))
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new ApiError(res.status, `invalid JSON: ${text.slice(0, 200)}`)
  }

  return {
    content: Array.isArray(data.content) ? data.content : [],
    usage: data.usage || { input_tokens: 0, output_tokens: 0 },
    stop_reason: data.stop_reason || 'unknown',
    model: data.model || model,
  }
}

/**
 * @param {unknown} data
 */
function normalizeStreamPayload(data) {
  if (!data || typeof data !== 'object') {
    return { type: 'error', error: { type: 'parse', message: 'invalid stream payload' } }
  }

  const t = /** @type {{type: string}} */ (data).type
  if (t === 'ping') return { type: 'ping' }
  if (t === 'message_start') {
    return { type: 'message_start', message: data.message }
  }
  if (t === 'content_block_start') {
    return {
      type: 'content_block_start',
      index: data.index,
      content_block: data.content_block,
    }
  }
  if (t === 'content_block_delta') {
    return {
      type: 'content_block_delta',
      index: data.index,
      delta: data.delta,
    }
  }
  if (t === 'content_block_stop') {
    return { type: 'content_block_stop', index: data.index }
  }
  if (t === 'message_delta') {
    return {
      type: 'message_delta',
      delta: data.delta,
      usage: data.usage,
    }
  }
  if (t === 'message_stop') {
    return { type: 'message_stop' }
  }
  if (t === 'error') {
    return { type: 'error', error: data.error || { type: 'unknown', message: 'stream error' } }
  }

  return data
}

/**
 * @param {import('./index.js').ApiCallInput} input
 */
export async function* callApiStream(input) {
  const {
    apiBase,
    apiKey,
    model,
    maxTokens,
    system,
    messages,
    tools,
    signal,
    timeoutMs = 30000,
  } = input

  throwIfAborted(signal)

  const url = `${apiBase.replace(/\/$/, '')}/v1/messages`
  const body = {
    model,
    max_tokens: maxTokens,
    stream: true,
    messages,
    ...(system ? { system } : {}),
    ...(tools?.length ? { tools } : {}),
  }

  const { signal: fetchSignal, cleanup } = linkAbortSignal(signal, timeoutMs)

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: fetchSignal,
    })
  } catch (err) {
    cleanup()
    if (err?.name === 'AbortError') {
      throw new ApiError(0, 'aborted by session')
    }
    throw err
  }

  if (!res.ok) {
    cleanup()
    const text = await res.text().catch(() => '')
    throw new ApiError(res.status, text.slice(0, 300))
  }

  if (!res.body) {
    cleanup()
    throw new ApiError(0, 'empty stream body')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      throwIfAborted(signal)
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      while (true) {
        const nl = buffer.indexOf('\n')
        if (nl === -1) break

        const line = buffer.slice(0, nl).replace(/\r$/, '')
        buffer = buffer.slice(nl + 1)

        if (!line.trim()) continue
        if (line.startsWith('event:')) continue
        if (!line.startsWith('data:')) continue

        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue

        try {
          yield normalizeStreamPayload(JSON.parse(payload))
        } catch (e) {
          yield {
            type: 'error',
            error: { type: 'parse', message: e?.message || String(e) },
          }
        }
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new ApiError(0, 'aborted by session')
    }
    throw err
  } finally {
    cleanup()
    try {
      reader.releaseLock()
    } catch {
      /* ignore */
    }
  }
}
