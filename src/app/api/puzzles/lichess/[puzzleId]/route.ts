import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ puzzleId: string }> }
) {
  try {
    const { puzzleId } = await params;
    
    const response = await fetch(
      `https://lichess.org/api/puzzle/${puzzleId}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch puzzle from Lichess" },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      fen: data.puzzle.fen,
      solution: data.puzzle.solution || [],
      themes: data.puzzle.themes || [],
      rating: data.puzzle.rating,
      id: data.puzzle.id,
    });
  } catch (error) {
    console.error("Error fetching puzzle from Lichess:", error);
    return NextResponse.json(
      { error: "Failed to fetch puzzle" },
      { status: 500 }
    );
  }
}