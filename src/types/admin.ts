// TypeScript interfaces for admin dashboard tables

// Active Players
export interface ActivePlayer {
  UNIQUE_NO: string | null
  SURNAME: string | null
  FIRSTNAME: string | null
  BDATE: string | null
  SEX: string | null
  TITLE: string | null
  RATING: string | null
  FED: string | null
  name: string | null
  player_rating: string | null
  tie_breaks: string | null
  performance_rating: string | null
  confidence: string | null
  classifications: string | null
  tournament_id: string | null
  tournament_name: string | null
  created_at: string | null
}

// Tournaments
export interface Tournament {
  id: string
  tournament_name: string | null
  organizer: string | null
  federation: string | null
  tournament_director: string | null
  chief_arbiter: string | null
  deputy_chief_arbiter: string | null
  arbiter: string | null
  time_control: string | null
  rate_of_play: string | null
  location: string | null
  rounds: number | null
  tournament_type: string | null
  rating_calculation: string | null
  date: string | null
  average_elo: number | null
  average_age: number | null
  source: string | null
  created_at: string
}

// Players
export interface Player {
  id: string
  tournament_id: string | null
  rank: number | null
  name: string | null
  federation: string | null
  rating: number | null
  points: number | null
  rounds: Record<string, any> | null
  tie_breaks: Record<string, any> | null
  created_at: string
}

// Profiles
export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: 'student' | 'coach' | 'admin'
  created_at: string
  tournament_fullname: string | null
  chessa_id: string | null
}

// Player Registrations
export interface PlayerRegistration {
  id: number
  created_at: string
  data_entry: Record<string, any> | null
}

// Generic table response
export interface TableResponse<T> {
  data: T[] | null
  error: string | null
  count?: number
  totalPages?: number
}

// Pagination config
export interface PaginationConfig {
  page: number
  itemsPerPage: number
  totalItems: number
  totalPages: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (items: number) => void
}

// Export options
export interface ExportOptions {
  format: 'csv' | 'excel' | 'json'
  scope: 'current' | 'filtered' | 'all'
  excludeFields?: string[]
  fieldMapping?: Record<string, string>
  filename?: string
  includeMetadata?: boolean // For JSON exports
  pretty?: boolean // For JSON exports
}

// Filter options
export interface FilterOptions {
  search?: string
  minRating?: number
  maxRating?: number
  federation?: string
  tournament?: string
  role?: 'student' | 'coach' | 'admin'
  dateFrom?: string
  dateTo?: string
}

// Column definition for generic data table
export interface ColumnDef<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  className?: string
}
