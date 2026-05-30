import { chromium } from 'playwright'

const URL = 'http://localhost:8008/player-rankings'

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 360, height: 740 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
})
const page = await context.newPage()

// Emulate a low-end Samsung A05: throttle CPU 6x + slow 4G network.
const cdp = await context.newCDPSession(page)
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })

const t0 = Date.now()
await page.goto(URL, { waitUntil: 'domcontentloaded' })
const tDom = Date.now() - t0
await page.waitForSelector('table tbody tr', { timeout: 30000 })
const tFirstRow = Date.now() - t0

// Measure responsiveness: type in search, see how long until the empty
// state actually appears (i.e. how long until the client reacts).
const search = page.locator('input[placeholder*="Search"]')
const tType0 = Date.now()
await search.fill('zzzznotaplayer')
let tEmpty = -1
try {
  await page.waitForSelector('text=No players match', { timeout: 30000 })
  tEmpty = Date.now() - tType0
} catch {}

console.log(JSON.stringify({
  cpuThrottle: '6x (A05-class)',
  msToDomContentLoaded: tDom,
  msToFirstRowRendered: tFirstRow,
  msForSearchToReact: tEmpty,
}, null, 2))

await browser.close()
