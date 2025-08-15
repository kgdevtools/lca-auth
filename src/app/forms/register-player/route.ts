import { NextResponse } from "next/server"
import { registerPlayer } from "./action"

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    await registerPlayer(payload)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}



