import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ studyId: string }> }
) {
  const { studyId } = await params

  if (!studyId || !/^[a-zA-Z0-9]+$/.test(studyId)) {
    return NextResponse.json({ error: 'Invalid study ID' }, { status: 400 })
  }

  // Try the documented Lichess API endpoint first, then the web endpoint as fallback
  const candidates = [
    `https://lichess.org/api/study/${studyId}.pgn?comments=true&clocks=true&variations=true`,
    `https://lichess.org/study/${studyId}.pgn?comments=true&clocks=true&variations=true`,
  ]

  let lastStatus = 0
  let fullPgn = ''

  for (const url of candidates) {
    try {
      console.log(`[lichess-study] Fetching: ${url}`)
      const res = await fetch(url, {
        headers: {
          Accept: 'application/x-chess-pgn, text/plain, */*',
          'User-Agent': 'LCA-Academy/1.0',
        },
        // next.js: don't cache externally-fetched PGN
        cache: 'no-store',
      })

      lastStatus = res.status
      console.log(`[lichess-study] Response status: ${res.status} for ${url}`)

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error(`[lichess-study] Error body (first 200 chars): ${body.slice(0, 200)}`)
        continue // try next candidate
      }

      const text = await res.text()

      // Lichess sometimes returns the HTML 404 page even on 200 — detect it
      if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
        console.error('[lichess-study] Received HTML instead of PGN')
        lastStatus = 404
        continue
      }

      fullPgn = text
      break
    } catch (err) {
      console.error(`[lichess-study] Fetch exception for ${url}:`, err)
    }
  }

  if (!fullPgn) {
    let message = 'Failed to import study.'
    if (lastStatus === 404) {
      message =
        'Study not found (404). Make sure the study is public on Lichess — private studies cannot be imported without authentication.'
    } else if (lastStatus === 401 || lastStatus === 403) {
      message =
        'Access denied (403). This study is private. Make it public on Lichess and try again.'
    } else if (lastStatus === 429) {
      message = 'Lichess rate limit reached (429). Wait a minute and try again.'
    } else if (lastStatus >= 500) {
      message = `Lichess server error (${lastStatus}). Try again in a few seconds.`
    } else if (lastStatus === 0) {
      message =
        'Could not reach Lichess. Check your internet connection or try again.'
    }
    return NextResponse.json({ error: message }, { status: lastStatus || 502 })
  }

  // Split multi-chapter PGN — each chapter is separated by a blank line before a header tag
  const chapterBlocks = fullPgn
    .split(/\n\n(?=\[)/)
    .map(b => b.trim())
    .filter(b => b.length > 0 && b.startsWith('['))

  if (chapterBlocks.length === 0) {
    return NextResponse.json(
      { error: 'The study PGN was empty or could not be parsed.' },
      { status: 422 }
    )
  }

  const chapters = chapterBlocks.map(block => {
    const nameMatch =
      block.match(/\[ChapterName "([^"]+)"\]/) ||
      block.match(/\[Event "([^"]+)"\]/)
    const orientationMatch = block.match(/\[Orientation "(black|white)"\]/i)

    return {
      name: nameMatch?.[1] || 'Chapter',
      pgn: block,
      orientation: (orientationMatch?.[1]?.toLowerCase() || 'white') as 'white' | 'black',
    }
  })

  const studyNameMatch =
    fullPgn.match(/\[StudyName "([^"]+)"\]/) ||
    fullPgn.match(/\[Event "([^"]+)"\]/)

  return NextResponse.json({
    studyId,
    studyName: studyNameMatch?.[1] || studyId,
    chapters,
  })
}
