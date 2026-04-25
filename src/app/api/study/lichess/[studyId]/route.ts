import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studyId: string }> }
) {
  try {
    const { studyId } = await params
    const lichessApi = 'https://lichess.org/api'

    const studyResponse = await fetch(`${lichessApi}/study/${studyId}`, {
      headers: { Accept: 'application/json' },
    })

    if (!studyResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch study' }, { status: studyResponse.status })
    }

    const studyData = await studyResponse.json()

    const chapters: Array<{
      name: string
      pgn: string
      orientation: 'white' | 'black'
    }> = []

    if (studyData.chapters && studyData.chapters.length > 0) {
      for (const chapter of studyData.chapters) {
        try {
          const pgnResponse = await fetch(
            `${lichessApi}/study/${studyId}/${chapter.id}.pgn?comments=true&clocks=true&variations=true`,
            { headers: { Accept: 'application/x-chess-pgn' } }
          )

          if (pgnResponse.ok) {
            const pgn = await pgnResponse.text()
            
            let orientation: 'white' | 'black' = 'white'
            const orientationMatch = pgn.match(/\[Orientation "(black|white)"]/)
            if (orientationMatch) {
              orientation = orientationMatch[1] as 'white' | 'black'
            }

            chapters.push({
              name: chapter.name || 'Unnamed Chapter',
              pgn,
              orientation,
            })
          }
        } catch (err) {
          console.error(`Failed to fetch chapter ${chapter.id}:`, err)
        }
      }
    } else {
      const pgnResponse = await fetch(
        `${lichessApi}/study/${studyId}.pgn?comments=true&clocks=true&variations=true`,
        { headers: { Accept: 'application/x-chess-pgn' } }
      )

      if (pgnResponse.ok) {
        const pgn = await pgnResponse.text()
        
        let orientation: 'white' | 'black' = 'white'
        const orientationMatch = pgn.match(/\[Orientation "(black|white)"]/)
        if (orientationMatch) {
          orientation = orientationMatch[1] as 'white' | 'black'
        }

        chapters.push({
          name: studyData.name || 'Study',
          pgn,
          orientation,
        })
      }
    }

    return NextResponse.json({
      studyId,
      studyName: studyData.name,
      chapters,
    })
  } catch (error) {
    console.error('Error fetching Lichess study:', error)
    return NextResponse.json({ error: 'Failed to fetch study' }, { status: 500 })
  }
}
