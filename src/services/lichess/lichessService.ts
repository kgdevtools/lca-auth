const LICHESS_API = 'https://lichess.org/api'

export interface LichessStudy {
  id: string
  name: string
  description: string
  chapters: LichessChapter[]
}

export interface LichessChapter {
  id: string
  name: string
  pgn: string
}

export async function fetchStudy(studyId: string): Promise<LichessStudy | null> {
  try {
    const res = await fetch(`${LICHESS_API}/study/${studyId}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    console.error('Failed to fetch study:', error)
    return null
  }
}

export async function fetchStudyChapters(studyId: string): Promise<LichessChapter[]> {
  try {
    const res = await fetch(`${LICHESS_API}/study/${studyId}/chapters`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    return res.json()
  } catch (error) {
    console.error('Failed to fetch study chapters:', error)
    return []
  }
}

export async function fetchChapterPgn(studyId: string, chapterId: string): Promise<string> {
  try {
    const res = await fetch(
      `${LICHESS_API}/study/${studyId}/chapter/${chapterId}.pgn`,
      { headers: { Accept: 'application/x-chess-pgn' } }
    )
    if (!res.ok) return ''
    return res.text()
  } catch (error) {
    console.error('Failed to fetch chapter PGN:', error)
    return ''
  }
}

export async function fetchUserStudies(username: string): Promise<LichessStudy[]> {
  try {
    const res = await fetch(`${LICHESS_API}/study/of/${username}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    return res.json()
  } catch (error) {
    console.error('Failed to fetch user studies:', error)
    return []
  }
}

export function parseStudyUrl(url: string): { studyId: string; chapterId?: string } | null {
  const patterns = [
    /lichess\.org\/study\/([a-zA-Z0-9]+)/,
    /lichess\.org\/study\/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return {
        studyId: match[1],
        chapterId: match[2],
      }
    }
  }
  return null
}
