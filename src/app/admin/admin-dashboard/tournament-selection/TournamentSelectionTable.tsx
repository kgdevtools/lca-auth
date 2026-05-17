"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Trash2, Save, X, Eye, Loader2, CheckCircle, XCircle, ChevronDown, ChevronRight, Pencil } from "lucide-react"
import { 
  TournamentSelectionMeta, 
  Tournament,
  saveSelectionMeta, 
  deleteSelectionMeta,
  getTournaments,
  getTournamentStats,
  JuniorPlayerStats
} from "./actions"
import { PlayerDetailsModal } from "./PlayerDetailsModal"
import { createClient } from "@/utils/supabase/client"

interface TournamentSelectionTableProps {
  initialSelectionMeta: TournamentSelectionMeta[]
  detectedTournaments: Tournament[]
  juniorPlayers: JuniorPlayerStats[]
}

const inputBase = "h-8 w-full px-2.5 rounded-sm border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors"

const PERIODS = [
  { label: "2024-2025", value: "2024-2025", start: "2024-10-01", end: "2025-09-30" },
  { label: "2025-2026", value: "2025-2026", start: "2025-10-01", end: "2026-09-30" },
]

function normalizeDate(date: string): string {
  return date.replace(/\//g, '-')
}

function isInPeriod(date: string | null, periodValue: string): boolean {
  if (!date) return false
  const period = PERIODS.find(p => p.value === periodValue)
  if (!period) return false
  return normalizeDate(date) >= period.start && normalizeDate(date) <= period.end
}

export default function TournamentSelectionTable({
  initialSelectionMeta,
  detectedTournaments,
  juniorPlayers
}: TournamentSelectionTableProps) {
  const [items, setItems] = useState<TournamentSelectionMeta[]>(initialSelectionMeta)
  const [saving, setSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([])
  const [loadingTournaments, setLoadingTournaments] = useState(false)
  const [searchTournament, setSearchTournament] = useState("")
  const [period, setPeriod] = useState("2025-2026")
  const [selectedDetected, setSelectedDetected] = useState<Set<string>>(new Set())
  const [selectedModal, setSelectedModal] = useState<Set<string>>(new Set())
  const [notesModalId, setNotesModalId] = useState<string | null>(null)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [fetchingIds, setFetchingIds] = useState<Set<string>>(new Set())
  const [detectedOpen, setDetectedOpen] = useState(true)
  const [approvalOpen, setApprovalOpen] = useState(true)
  
  const [juniorPlayersOpen, setJuniorPlayersOpen] = useState(true)
  const [playerSearch, setPlayerSearch] = useState("")
  const [qualificationFilter, setQualificationFilter] = useState<"ALL" | "qualified" | "not_qualified">("ALL")
  const [selectedPlayer, setSelectedPlayer] = useState<JuniorPlayerStats | null>(null)

  const existingIds = new Set(items.map(t => t.tournament_id).filter(Boolean))

  const juniorQualifyingKeywords = [
    "capricorn qualifying", "winter games", "primary schools league", "primary schools",
    "junior trials", "high schools league", "team practice", "team champs", "provincial junior",
    "cdc junior qualifiers", "cdc junior qualifying", "cdc qualifiers",
    "capricorn junior qualifying", "capricorn district chess",
    "vhembe district chess junior", "vhembe district junior",
    "mopani open junior", "mopani district junior qualifiers",
    "sekhukhune junior qualifying", "sekhukhune junior qualifiers",
    "waterberg junior"
  ]
  
  const limpopoKeywords = [
    "capricorn", "limpopo", "vhembe", "mopani", "sekhukhune", "waterberg",
    "polokwane", "seshego", "tzaneen", "mokopane", "dendron", "musina",
    "northern academy", "university of limpopo", "turfloop", "capricorn tvet", "flora park"
  ]

  function isJuniorQualifying(name: string): boolean {
    const lower = name.toLowerCase()
    return juniorQualifyingKeywords.some(kw => lower.includes(kw))
  }

  function isCapricornRegion(name: string, location: string | null): boolean {
    const lowerName = name.toLowerCase()
    const nameMatch = limpopoKeywords.some(kw => lowerName.includes(kw))
    if (nameMatch) return true
    if (location) {
      const lowerLoc = location.toLowerCase()
      return limpopoKeywords.some(kw => lowerLoc.includes(kw))
    }
    const patterns = [/\bpolokwane\b/i, /\blimpopo\b/i, /\bseshego\b/i, /\btzaneen\b/i]
    return patterns.some(p => p.test(name))
  }

  const handleApprove = (id: string, checked: boolean) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, approved: checked } : item
    ))
  }

  const handleNotesChange = (id: string, notes: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, notes } : item
    ))
  }

  const fetchStatsForItem = async (item: TournamentSelectionMeta) => {
    if (fetchingIds.has(item.id)) return
    if (!item.tournament_id) {
      console.log('[fetchStatsForItem] No tournament_id, skipping')
      return
    }
    setFetchingIds(prev => new Set(prev).add(item.id))
    
    const stats = await getTournamentStats(item.tournament_id)
    
    setItems(prev => prev.map(i => 
      i.id === item.id 
        ? { 
            ...i, 
            player_count: stats.playerCount, 
            avg_top_seeds: stats.avgTopSeeds,
            rating_threshold: stats.avgTopSeeds ? (stats.avgTopSeeds >= 1400 ? 1400 : 1200) : null
          } 
        : i
    ))
    setFetchingIds(prev => {
      const next = new Set(prev)
      next.delete(item.id)
      return next
    })
  }

  const handleSave = async () => {
    setShowSummaryModal(true)
  }

  const confirmSave = async () => {
    setSaving(true)
    setShowSummaryModal(false)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const approvedBy = user?.email || "admin"
    
    // First save all items
    const result = await saveSelectionMeta(items, approvedBy)
    
    // Then fetch stats for all items that don't have stats yet
    const itemsNeedingStats = items.filter(i => i.player_count === null)
    for (const item of itemsNeedingStats) {
      await fetchStatsForItem(item)
    }
    
    setSaving(false)
    
    if (!result.success) {
      alert(`Error saving: ${result.error}`)
    } else {
      // Clear the tables after successful save
      setItems([])
      setSelectedDetected(new Set())
      setSelectedModal(new Set())
      setSearchTournament("")
      alert("Saved successfully!")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tournament?")) return
    const result = await deleteSelectionMeta(id)
    if (result.success) {
      setItems(prev => prev.filter(item => item.id !== id))
    } else {
      alert(`Error deleting: ${result.error}`)
    }
  }

  const handleAddSelectedDetected = async () => {
    const toAdd = detectedTournaments.filter(t => selectedDetected.has(t.id) && !existingIds.has(t.id))
    const newItems: TournamentSelectionMeta[] = []
    
    for (const t of toAdd) {
      const newItem: TournamentSelectionMeta = {
        id: crypto.randomUUID(),
        tournament_id: t.id,
        tournament_name: t.tournament_name || "",
        tournament_type: isJuniorQualifying(t.tournament_name || "") ? 'junior_qualifying' : 'other',
        age_category: 'Open',
        player_count: null,
        avg_top_seeds: null,
        rating_threshold: null,
        meets_criteria: false,
        is_capricorn: isCapricornRegion(t.tournament_name || "", t.location),
        approved: true,
        approved_by: null,
        approved_at: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      newItems.push(newItem)
    }
    
    setItems(prev => [...prev, ...newItems])
    setSelectedDetected(new Set())
    
    // Auto-fetch stats for new items
    for (const item of newItems) {
      fetchStatsForItem(item)
    }
  }

  const handleOpenAddModal = async () => {
    setLoadingTournaments(true)
    const tournaments = await getTournaments()
    setAllTournaments(tournaments)
    setLoadingTournaments(false)
    setIsModalOpen(true)
    setSearchTournament("")
    setSelectedModal(new Set())
  }

  const handleAddSelectedModal = () => {
    const toAdd = allTournaments.filter(t => selectedModal.has(t.id) && !existingIds.has(t.id))
    const newItems: TournamentSelectionMeta[] = []
    
    for (const t of toAdd) {
      const newItem: TournamentSelectionMeta = {
        id: crypto.randomUUID(),
        tournament_id: t.id,
        tournament_name: t.tournament_name || "",
        tournament_type: isJuniorQualifying(t.tournament_name || "") ? 'junior_qualifying' : 'other',
        age_category: 'Open',
        player_count: null,
        avg_top_seeds: null,
        rating_threshold: null,
        meets_criteria: false,
        is_capricorn: isCapricornRegion(t.tournament_name || "", t.location),
        approved: true,
        approved_by: null,
        approved_at: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      newItems.push(newItem)
    }
    
    setItems(prev => [...prev, ...newItems])
    setSelectedModal(new Set())
    setIsModalOpen(false)
    
    // Auto-fetch stats for new items
    for (const item of newItems) {
      fetchStatsForItem(item)
    }
  }

  const filteredDetected = detectedTournaments.filter(t => {
    if (!t.tournament_name) return false
    if (existingIds.has(t.id)) return false
    if (!t.tournament_name.toLowerCase().includes(searchTournament.toLowerCase())) return false
    if (period && t.date && !isInPeriod(t.date, period)) return false
    return true
  })

  const filteredModalTournaments = allTournaments.filter(t => 
    t.tournament_name?.toLowerCase().includes(searchTournament.toLowerCase()) &&
    (period && t.date ? isInPeriod(t.date, period) : true)
  )

  const toggleDetected = (id: string) => {
    setSelectedDetected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleModal = (id: string) => {
    setSelectedModal(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allDetectedSelected = filteredDetected.length > 0 && filteredDetected.every(t => selectedDetected.has(t.id))
  const allModalSelected = filteredModalTournaments.length > 0 && filteredModalTournaments.every(t => selectedModal.has(t.id))

  const juniorCount = items.filter(i => i.tournament_type === 'junior_qualifying').length
  const openCount = items.filter(i => i.tournament_type === 'open' || i.tournament_type === 'other').length

  const filteredJuniorPlayers = juniorPlayers.filter(p => {
    if (playerSearch) {
      const searchLower = playerSearch.toLowerCase()
      if (!p.display_name.toLowerCase().includes(searchLower) && 
          !p.surname.toLowerCase().includes(searchLower) &&
          !p.name.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    if (qualificationFilter === "qualified" && !p.meetsCriteria) return false
    if (qualificationFilter === "not_qualified" && p.meetsCriteria) return false
    return true
  })

  const qualifiedCount = juniorPlayers.filter(p => p.meetsCriteria).length

  return (
    <>
      {/* Junior Player Qualification Status - Collapsible */}
      <div className="bg-card border border-border rounded-sm shadow-sm overflow-hidden mb-6">
        <button 
          onClick={() => setJuniorPlayersOpen(!juniorPlayersOpen)}
          className="w-full px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between hover:bg-muted/40 transition-colors"
        >
          <div className="text-left">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              {juniorPlayersOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Junior Player Qualification Status
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {juniorPlayers.length} junior players • {qualifiedCount} qualified
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={qualificationFilter} 
              onChange={(e) => setQualificationFilter(e.target.value as "ALL" | "qualified" | "not_qualified")}
              className={inputBase + " w-36"}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="ALL">All</option>
              <option value="qualified">Qualified</option>
              <option value="not_qualified">Not Qualified</option>
            </select>
          </div>
        </button>
        
        {juniorPlayersOpen && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1 min-w-[35%]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className={inputBase + " pl-8"}
                />
              </div>
              <span className="text-xs text-muted-foreground">{filteredJuniorPlayers.length} players</span>
            </div>
            
            {filteredJuniorPlayers.length > 0 ? (
              <div className="border rounded-sm overflow-auto max-h-96">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground">Player</th>
                      <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground w-16">Age</th>
                      <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground w-16">Fed</th>
                      <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground w-16">Total</th>
                      <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground w-14">Open</th>
                      <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground w-14">Junr</th>
                      <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground w-14">Cpr</th>
                      <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground w-20">Status</th>
                      <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJuniorPlayers.map((player) => (
                      <>
                        <tr key={player.name_key} className="border-t border-border hover:bg-muted/30">
                          <td className="px-2.5 py-2 text-sm font-medium">{player.display_name}</td>
                          <td className="px-2.5 py-2 text-xs text-muted-foreground">{player.age_group || '-'}</td>
                          <td className="px-2.5 py-2 text-xs text-muted-foreground">{player.fed || '-'}</td>
                          <td className="px-2.5 py-2 text-xs">{player.totalTournaments}</td>
                          <td className="px-2.5 py-2 text-xs">{player.openTournaments}</td>
                          <td className="px-2.5 py-2 text-xs">{player.juniorTournaments}</td>
                          <td className="px-2.5 py-2">
                            {player.hasCapricornOpen ? (
                              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-red-400" />
                            )}
                          </td>
                          <td className="px-2.5 py-2">
                            {player.meetsCriteria ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                                Qualified
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                                Not Qual
                              </span>
                            )}
                          </td>
                          <td className="px-2.5 py-2">
                            <button
                              onClick={() => setSelectedPlayer(player)}
                              className="inline-flex items-center h-6 px-2 rounded-sm border border-border bg-card text-xs hover:bg-accent gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              Details
                            </button>
                          </td>
                        </tr>
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No junior players found</p>
            )}
          </div>
        )}
      </div>

      {/* Detection Panel - Collapsible */}
      <div className="bg-card border border-border rounded-sm shadow-sm overflow-hidden mb-6">
        <button 
          onClick={() => setDetectedOpen(!detectedOpen)}
          className="w-full px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between hover:bg-muted/40 transition-colors"
        >
          <div className="text-left">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              {detectedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Detected Tournaments
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Tournaments matching CDC Junior criteria</p>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={period} 
              onChange={(e) => setPeriod(e.target.value)}
              className={inputBase + " w-28"}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="ALL">All</option>
              {PERIODS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            {selectedDetected.size > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); handleAddSelectedDetected() }}
                className="inline-flex items-center h-8 px-3 rounded-sm bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add ({selectedDetected.size})
              </button>
            )}
          </div>
        </button>
        
        {detectedOpen && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1 min-w-[35%]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search detected..."
                value={searchTournament}
                onChange={(e) => setSearchTournament(e.target.value)}
                className={inputBase + " pl-8"}
              />
            </div>
            <span className="text-xs text-muted-foreground">{filteredDetected.length} found</span>
          </div>
          
          {filteredDetected.length > 0 ? (
            <div className="border rounded-sm overflow-auto max-h-48">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2.5 py-2 w-8">
                      <input 
                        type="checkbox" 
                        checked={allDetectedSelected}
                        onChange={() => {
                          if (allDetectedSelected) setSelectedDetected(new Set())
                          else setSelectedDetected(new Set(filteredDetected.map(t => t.id)))
                        }}
                        className="rounded-sm border-border"
                      />
                    </th>
                    <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground">Tournament</th>
                    <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground w-24">Type</th>
                    <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground w-20">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDetected.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-2.5 py-2">
                        <input 
                          type="checkbox" 
                          checked={selectedDetected.has(t.id)}
                          onChange={() => toggleDetected(t.id)}
                          className="rounded-sm border-border"
                        />
                      </td>
                      <td className="px-2.5 py-2 text-sm">{t.tournament_name}</td>
                      <td className="px-2.5 py-2">
                        {isJuniorQualifying(t.tournament_name || "") ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Junior
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-2.5 py-2">
                        <button 
                          onClick={() => {
                            setSelectedDetected(prev => new Set(prev).add(t.id))
                            handleAddSelectedDetected()
                          }}
                          className="inline-flex items-center h-6 px-2 rounded-sm border border-border bg-card text-xs hover:bg-accent gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No tournaments detected</p>
          )}
        </div>
        )}
      </div>

      {/* Main Approval Table - Collapsible */}
      <div className="bg-card border border-border rounded-sm shadow-sm overflow-hidden">
        <button 
          onClick={() => setApprovalOpen(!approvalOpen)}
          className="w-full px-4 py-3 border-b border-border flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
        >
          <div className="text-left">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              {approvalOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Selection Approval Table
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Manage approved tournaments for CDC Junior Selection</p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); handleOpenAddModal() }}
              className="inline-flex items-center h-8 px-3 rounded-sm bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Tournament
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleSave() }} 
              disabled={saving || items.length === 0}
              className="inline-flex items-center h-8 px-3 rounded-sm border border-border bg-card text-xs font-medium hover:bg-accent gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </button>
        
        {approvalOpen && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground min-w-[200px]">Tournament</th>
                <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground w-20">Type</th>
                <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground w-20">Players</th>
                <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground w-20">Avg Seeds</th>
                <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground w-20">Threshold</th>
                <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground">Notes</th>
                <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2.5 py-8 text-center text-sm text-muted-foreground">
                    No tournaments. Add from detected above or click "Add Tournament".
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-2.5 py-2 text-sm font-medium">{item.tournament_name}</td>
                    <td className="px-2.5 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        item.tournament_type === 'junior_qualifying' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {item.tournament_type === 'junior_qualifying' ? 'Junior' : 'Open'}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 text-xs">
                      {fetchingIds.has(item.id) ? (
                        <div className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                          <span className="text-muted-foreground">Loading...</span>
                        </div>
                      ) : item.player_count !== null ? (
                        item.player_count
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-2.5 py-2 text-xs">
                      {item.avg_top_seeds !== null ? item.avg_top_seeds : '-'}
                    </td>
                    <td className="px-2.5 py-2 text-xs">
                      {item.rating_threshold !== null ? item.rating_threshold : '-'}
                    </td>
                    <td className="px-2.5 py-2">
                      <button
                        onClick={() => setNotesModalId(item.id)}
                        className="inline-flex items-center h-6 px-2 rounded-sm border border-border bg-card text-xs hover:bg-accent gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        {item.notes ? 'Edit' : 'Add'}
                      </button>
                    </td>
                    <td className="px-2.5 py-2">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex items-center h-6 px-1.5 rounded-sm text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Add Tournament Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] max-w-4xl max-h-[80vh] bg-card border-2 border-border rounded-sm shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Add Tournament</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-sm hover:bg-accent">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1 min-w-[35%]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search tournaments..."
                    value={searchTournament}
                    onChange={(e) => setSearchTournament(e.target.value)}
                    className={inputBase + " pl-8"}
                  />
                </div>
                <select 
                  value={period} 
                  onChange={(e) => setPeriod(e.target.value)}
                  className={inputBase + " w-28"}
                >
                  <option value="ALL">All Periods</option>
                  {PERIODS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                {selectedModal.size > 0 && (
                  <button
                    onClick={handleAddSelectedModal}
                    className="inline-flex items-center h-8 px-3 rounded-sm bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add ({selectedModal.size})
                  </button>
                )}
              </div>
              
              {loadingTournaments ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredModalTournaments.length > 0 ? (
                <div className="border rounded-sm overflow-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-2.5 py-2 w-8">
                          <input 
                            type="checkbox" 
                            checked={allModalSelected}
                            onChange={() => {
                              if (allModalSelected) setSelectedModal(new Set())
                              else setSelectedModal(new Set(filteredModalTournaments.map(t => t.id)))
                            }}
                            className="rounded-sm border-border"
                          />
                        </th>
                        <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground">Tournament</th>
                        <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground w-32">Location</th>
                        <th className="px-2.5 py-2 text-left text-xs font-medium text-muted-foreground w-24">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredModalTournaments.map((t) => (
                        <tr key={t.id} className="border-t border-border">
                          <td className="px-2.5 py-2">
                            <input 
                              type="checkbox" 
                              checked={selectedModal.has(t.id)}
                              onChange={() => toggleModal(t.id)}
                              disabled={existingIds.has(t.id)}
                              className="rounded-sm border-border"
                            />
                          </td>
                          <td className="px-2.5 py-2 text-sm">{t.tournament_name}</td>
                          <td className="px-2.5 py-2 text-xs text-muted-foreground">{t.location || '-'}</td>
                          <td className="px-2.5 py-2 text-xs text-muted-foreground">{t.date || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No tournaments found</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Notes Modal */}
      {notesModalId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setNotesModalId(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-md bg-card border-2 border-border rounded-sm shadow-xl">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Notes</h3>
              <button onClick={() => setNotesModalId(null)} className="p-1 rounded-sm hover:bg-accent">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={items.find(i => i.id === notesModalId)?.notes || ''}
                onChange={(e) => handleNotesChange(notesModalId, e.target.value)}
                placeholder="Add notes about this tournament..."
                className="w-full h-32 px-3 py-2 rounded-sm border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 resize-none"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => setNotesModalId(null)}
                  className="inline-flex items-center h-8 px-3 rounded-sm border border-border bg-card text-xs font-medium hover:bg-accent"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Save Summary Modal */}
      {showSummaryModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowSummaryModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-2xl bg-card border-2 border-border rounded-sm shadow-xl">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Save Changes - Summary</h3>
              <button onClick={() => setShowSummaryModal(false)} className="p-1 rounded-sm hover:bg-accent">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4">
              {/* Stats Summary */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1 p-3 rounded-sm border border-border bg-muted/30 text-center">
                  <div className="text-2xl font-bold text-foreground">{items.length}</div>
                  <div className="text-xs text-muted-foreground">Total Entries</div>
                </div>
                <div className="flex-1 p-3 rounded-sm border border-amber-200 bg-amber-50 text-center">
                  <div className="text-2xl font-bold text-amber-700">{juniorCount}</div>
                  <div className="text-xs text-amber-600">Junior Qualifying</div>
                </div>
                <div className="flex-1 p-3 rounded-sm border border-blue-200 bg-blue-50 text-center">
                  <div className="text-2xl font-bold text-blue-700">{openCount}</div>
                  <div className="text-xs text-blue-600">Open</div>
                </div>
              </div>

              {/* Tournament List */}
              <div className="border rounded-sm">
                <div className="px-3 py-2 bg-muted/50 border-b">
                  <span className="text-xs font-medium text-muted-foreground">Tournament List</span>
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full">
                    <thead className="bg-muted/30 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-8">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-20">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id} className="border-t border-border">
                          <td className="px-3 py-2 text-xs text-muted-foreground">{idx + 1}</td>
                          <td className="px-3 py-2 text-sm">{item.tournament_name}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[10px] font-medium ${
                              item.tournament_type === 'junior_qualifying' ? 'text-amber-700' : 'text-blue-700'
                            }`}>
                              {item.tournament_type === 'junior_qualifying' ? 'Junior' : 'Open'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="inline-flex items-center h-8 px-3 rounded-sm border border-border bg-card text-xs font-medium hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSave}
                  className="inline-flex items-center h-8 px-3 rounded-sm bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  Confirm & Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Player Details Modal */}
      <PlayerDetailsModal 
        player={selectedPlayer} 
        onClose={() => setSelectedPlayer(null)} 
      />
    </>
  )
}