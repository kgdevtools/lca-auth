/**
 * PGN parsing and fuzzy name matching utilities
 */
const DEBUG = Boolean(process.env.DEBUG_TOURNAMENT_MATCHING === '1' || process.env.NODE_ENV !== 'production')

export function parsePGNTags(raw: any) {
  try {
    if (DEBUG) console.log('pgnService.parsePGNTags: entry', { type: typeof raw, sample: typeof raw === 'string' ? raw.slice(0, 200) : undefined })
    // If raw is a string, search for tags with safe literal regexes
    if (typeof raw === 'string') {
      const pgn = raw
      const whiteMatch = pgn.match(/\[White\s+"([^\"]+)"\]/)
      const blackMatch = pgn.match(/\[Black\s+"([^\"]+)"\]/)
      const resultMatch = pgn.match(/\[Result\s+"([^\"]+)"\]/)
      const out = {
        pgn,
        white: whiteMatch ? whiteMatch[1] : '',
        black: blackMatch ? blackMatch[1] : '',
        result: resultMatch ? resultMatch[1] : '',
      }
      if (DEBUG) console.log('pgnService.parsePGNTags: parsed string', out)
      return out
    }

    if (!raw) return { pgn: '', white: '', black: '', result: '' }

    // If object has tags map
    if (typeof raw === 'object') {
      if (raw.tags && typeof raw.tags === 'object') {
        const pgn = JSON.stringify(raw)
        const white = raw.tags.White || raw.tags.white || ''
        const black = raw.tags.Black || raw.tags.black || ''
        const result = raw.tags.Result || raw.tags.result || ''
        const out = { pgn, white, black, result }
        if (DEBUG) console.log('pgnService.parsePGNTags: parsed tags object', out)
        return out
      }

      // If object contains a pgn-like string field
      const pgnField = raw.pgn || raw.raw || raw.pgn_text || ''
      if (typeof pgnField === 'string' && pgnField.length > 0) {
        const pgn = pgnField
        const whiteMatch = pgn.match(/\[White\s+"([^\"]+)"\]/)
        const blackMatch = pgn.match(/\[Black\s+"([^\"]+)"\]/)
        const resultMatch = pgn.match(/\[Result\s+"([^\"]+)"\]/)
        const out = {
          pgn,
          white: whiteMatch ? whiteMatch[1] : '',
          black: blackMatch ? blackMatch[1] : '',
          result: resultMatch ? resultMatch[1] : '',
        }
        if (DEBUG) console.log('pgnService.parsePGNTags: parsed object.pgn-like', out)
        return out
      }
      }

      // If direct fields exist
      const maybeWhite = raw.White || raw.white || ''
      const maybeBlack = raw.Black || raw.black || ''
      const maybeResult = raw.Result || raw.result || ''
      if (maybeWhite || maybeBlack || maybeResult) {
        const out = { pgn: JSON.stringify(raw), white: maybeWhite || '', black: maybeBlack || '', result: maybeResult || '' }
        if (DEBUG) console.log('pgnService.parsePGNTags: parsed direct fields', out)
        return out
      }

      // Fallback stringify and attempt regex
      const pgn = JSON.stringify(raw)
      const whiteMatch = pgn.match(/\[White\s+"([^\"]+)"\]/)
      const blackMatch = pgn.match(/\[Black\s+"([^\"]+)"\]/)
      const resultMatch = pgn.match(/\[Result\s+"([^\"]+)"\]/)
      const out = {
        pgn,
        white: whiteMatch ? whiteMatch[1] : '',
        black: blackMatch ? blackMatch[1] : '',
        result: resultMatch ? resultMatch[1] : '',
      }
      if (DEBUG) console.log('pgnService.parsePGNTags: parsed fallback', out)
      return out
    }
   catch (err) {
    console.error('pgnService.parsePGNTags error', err)
  }
  return { pgn: '', white: '', black: '', result: '' }
}

export function normalizeName(s = '') {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function levenshtein(a: string, b: string) {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

export function fuzzyScore(a: string, b: string) {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.95
  const dist = levenshtein(na, nb)
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 0
  return Math.max(0, 1 - dist / maxLen)
}

function tokensFromName(n: string) {
  return n.split(/\s+/).filter(Boolean)
}

function initialsOf(n: string) {
  return tokensFromName(n).map(t => t[0] || '').join('')
}

function reversedName(n: string) {
  return tokensFromName(n).reverse().join(' ')
}

export function enhancedFuzzyScore(a: string, b: string) {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (DEBUG) console.log('pgnService.enhancedFuzzyScore: entry', { a, b, na, nb })
  if (!na || !nb) return 0
  if (na === nb) {
    if (DEBUG) console.log('pgnService.enhancedFuzzyScore: exact match')
    return 1
  }

  // direct inclusion (substring) is very strong
  if (na.includes(nb) || nb.includes(na)) {
    if (DEBUG) console.log('pgnService.enhancedFuzzyScore: substring match', { na, nb })
    return 0.98
  }

  // reversed "Last First" detection
  if (na === reversedName(nb) || nb === reversedName(na)) {
    if (DEBUG) console.log('pgnService.enhancedFuzzyScore: reversed-name match', { na, nb, revA: reversedName(na), revB: reversedName(nb) })
    return 0.96
  }

  // initials match (e.g., j smith vs john smith)
  try {
    const ia = initialsOf(na)
    const ib = initialsOf(nb)
    if (ia && ib && ia === ib) {
      if (DEBUG) console.log('pgnService.enhancedFuzzyScore: initials match', { ia, ib })
      return 0.9
    }
  } catch (e) {
    // ignore
  }

  // token-part intersection ratio
  const ta = tokensFromName(na)
  const tb = tokensFromName(nb)
  const inter = ta.filter(x => tb.includes(x)).length
  const minLen = Math.min(ta.length || 1, tb.length || 1)
  const partRatio = inter / minLen
  if (DEBUG) console.log('pgnService.enhancedFuzzyScore: token intersection', { ta, tb, inter, partRatio })
  if (partRatio >= 0.66) {
    const sc = Math.max(0.9, 0.9 * partRatio)
    if (DEBUG) console.log('pgnService.enhancedFuzzyScore: partRatio strong', sc)
    return sc
  }

  // fallback to normalized levenshtein
  const dist = levenshtein(na, nb)
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 0
  const lev = Math.max(0, 1 - dist / maxLen)
  if (DEBUG) console.log('pgnService.enhancedFuzzyScore: levenshtein', { dist, maxLen, lev })

  // combine signals, prefer token overlap if present
  const outScore = Math.max(lev, partRatio * 0.85)
  if (DEBUG) console.log('pgnService.enhancedFuzzyScore: final score', outScore)
  return outScore
}
