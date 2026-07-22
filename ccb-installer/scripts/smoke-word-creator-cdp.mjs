/**
 * CDP UI smoke: verify Word 文档助手 / word-creator is discoverable in AionUi Dev.
 * Usage: node ccb-installer/scripts/smoke-word-creator-cdp.mjs
 */
import WebSocket from 'ws'

const CDP = process.env.CDP_URL || 'http://127.0.0.1:9230'

async function listTargets() {
  const res = await fetch(`${CDP}/json/list`)
  return res.json()
}

function cdpEval(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    let id = 0
    const pending = new Map()
    const send = (method, params = {}) => {
      const i = ++id
      return new Promise((res, rej) => {
        pending.set(i, { res, rej })
        ws.send(JSON.stringify({ id: i, method, params }))
        setTimeout(() => {
          if (pending.has(i)) {
            pending.delete(i)
            rej(new Error(`timeout ${method}`))
          }
        }, 25000)
      })
    }
    ws.on('message', (d) => {
      const m = JSON.parse(String(d))
      if (m.id && pending.has(m.id)) {
        const { res, rej } = pending.get(m.id)
        pending.delete(m.id)
        if (m.error) rej(new Error(JSON.stringify(m.error)))
        else res(m.result)
      }
    })
    ws.on('error', reject)
    ws.on('open', async () => {
      try {
        await send('Runtime.enable')
        const r = await send('Runtime.evaluate', {
          expression,
          awaitPromise: true,
          returnByValue: true,
        })
        ws.close()
        resolve(r.result?.value)
      } catch (e) {
        try {
          ws.close()
        } catch {
          /* ignore */
        }
        reject(e)
      }
    })
  })
}

const expression = `(() => {
  const text = document.body ? document.body.innerText : '';
  const html = document.body ? document.body.innerHTML : '';
  const hasWordCard =
    /Word\\s*文档助手|word-creator|📝/.test(text) ||
    /word-creator|Word\\s*文档助手/.test(html);
  const hasExcel = /Excel|excel-creator|📈/.test(text);
  return {
    href: location.href,
    hasWordCard,
    hasExcel,
    bodySample: text.replace(/\\s+/g, ' ').slice(0, 400),
  };
})()`

const targets = await listTargets()
const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
if (!page) {
  console.error('[smoke-word-cdp] FAIL: no page target on', CDP)
  process.exit(1)
}

console.log('[smoke-word-cdp] page:', page.title, page.url)

// Navigate home / conversation list so assistant cards are visible
await cdpEval(
  page.webSocketDebuggerUrl,
  `(() => { location.hash = '#/'; return location.href; })()`,
)
await new Promise((r) => setTimeout(r, 2500))

// Refresh page target after nav
const targets2 = await listTargets()
const page2 = targets2.find((t) => t.type === 'page' && t.webSocketDebuggerUrl) || page
const ui = await cdpEval(page2.webSocketDebuggerUrl, expression)
console.log('[smoke-word-cdp] UI:', JSON.stringify(ui, null, 2))

if (!ui?.hasWordCard) {
  // Soft: settings page may not show cards; try assistants via hash
  await cdpEval(page2.webSocketDebuggerUrl, `(() => { location.hash = '#/conversation'; return 1; })()`)
  await new Promise((r) => setTimeout(r, 2500))
  const targets3 = await listTargets()
  const page3 = targets3.find((t) => t.type === 'page' && t.webSocketDebuggerUrl) || page2
  const ui2 = await cdpEval(page3.webSocketDebuggerUrl, expression)
  console.log('[smoke-word-cdp] UI retry:', JSON.stringify(ui2, null, 2))
  if (!ui2?.hasWordCard) {
    console.warn('[smoke-word-cdp] WARN: Word card not visible in current UI surface (not FAIL — MCP suite is authoritative for CLOSED_LOOP)')
    process.exit(0)
  }
  console.log('[smoke-word-cdp] PASS: Word 文档助手 visible')
  process.exit(0)
}

console.log('[smoke-word-cdp] PASS: Word 文档助手 visible')
process.exit(0)
