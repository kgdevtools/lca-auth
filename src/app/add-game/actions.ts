'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Define the type for our form submission state
export interface FormState {
  message: string
  error: boolean
}

export async function addGameToDB(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient()

  const title = formData.get('title') as string
  const pgn = formData.get('pgn') as string

  // Basic validation
  if (!title || title.trim().length === 0) {
    return { message: 'Title is required.', error: true }
  }
  if (!pgn || pgn.trim().length === 0) {
    return { message: 'Cannot add an empty game. Please make at least one move.', error: true }
  }
  
  // Check user session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { message: 'You must be logged in to add a game.', error: true }
  }

  // Insert data into the 'tournament-games' table
  // The PGN string will be stored as a JSON string value in the `jsonb` column.
  const { error } = await supabase
    .from('tournament-games')
    .insert([{ title, pgn }])

  if (error) {
    console.error('Supabase error:', error.message)
    return { message: `Database error: ${error.message}`, error: true }
  }

  // On success, clear the cache for the add-game page and redirect
  revalidatePath('/add-game')
  // We don't redirect immediately to allow the success message to be shown
  // redirect('/add-game') // Alternatively, uncomment to clear the form on success
  
  return { message: 'Game successfully added to the database!', error: false }
}