export interface UpcomingTournament {
  id: string
  tournament_name: string
  tournament_date: string
  location: string
  organizer_name: string
  organizer_contact: string
  registration_form_link: string
  poster_url?: string
  poster_public_id?: string
  sections?: TournamentSection[]
  description?: string
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface TournamentSection {
  title: string
  content: string
  section?: string
}

export interface CreateUpcomingTournamentPayload {
  tournament_name: string
  tournament_date: string
  location: string
  organizer_name: string
  organizer_contact: string
  registration_form_link: string
  poster_url?: string
  poster_public_id?: string
  sections?: TournamentSection[]
  description?: string
}