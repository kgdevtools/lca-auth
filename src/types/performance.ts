// types/performance.ts
export interface Player {
  id: string
  lim_id: string | null
  surname: string | null
  firstname: string | null
  normalized_name: string | null
  unique_no: string | null
  federation: string | null
  cf_rating: number | null
  avg_performance_rating: number | null
  performance_count: number | null
  bdate: string | null
  sex: string | null
  performance_stats?: PerformanceDetail[] // Add this
  performance_stats_resolved?: boolean
  confidence_score?: number
  is_reconciled?: boolean
}

export interface PerformanceDetail {
  points?: number
  confidence?: string
  total_wins?: number
  player_name?: string
  source_name?: string
  total_draws?: number
  total_losses?: number
  total_rounds?: number
  player_rating?: number | null
  tournament_id?: string
  tournament_name?: string
  performance_rating?: number | null
  classifications?: {
    TB1?: string
    TB2?: string
    TB3?: string
    TB4?: string
    TB5?: string
    [key: string]: string | undefined
  }
  date?: string
  place?: number
  category?: string
  opponents?: Array<{
    name?: string
    rating?: number
    result?: string
  }>
}

export type FilterType = 'all' | 'resolved' | 'no_tp' | 'u20' | 'u18' | 'u16' | 'u14' | 'u12' | 'u10' | 'male' | 'female'
