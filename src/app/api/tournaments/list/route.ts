import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('tournaments_meta')
      .select('id, name, created_at')
      .order('name')

    if (error) {
      console.error('Error fetching tournaments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tournaments' },
        { status: 500 }
      )
    }

    // Transform the data to match expected format
    // The 'name' field contains the table name (e.g., "cdc_tournament_3_2025_games")
    const transformedData = (data || []).map(tournament => ({
      id: tournament.id,
      table_name: tournament.name,
      display_name: tableNameToDisplayName(tournament.name),
      created_at: tournament.created_at
    }))

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('Error in GET /api/tournaments/list:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to convert table name to display name
function tableNameToDisplayName(tableName: string): string {
  if (!tableName) return ''

  // Remove '_games' suffix
  let displayName = tableName.replace(/_games$/, '')

  // Replace underscores with spaces
  displayName = displayName.replace(/_/g, ' ')

  // Capitalize each word
  displayName = displayName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return displayName
}
