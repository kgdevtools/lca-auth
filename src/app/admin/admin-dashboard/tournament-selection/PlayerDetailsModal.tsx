"use client"

import { X, Check, CircleQuestionMark } from "lucide-react"
import { useState } from "react"
import type { JuniorPlayerStats } from "./actions"

interface PlayerDetailsModalProps {
  player: JuniorPlayerStats | null
  onClose: () => void
}

export function PlayerDetailsModal({ player, onClose }: PlayerDetailsModalProps) {
  const [showPolicyTooltip, setShowPolicyTooltip] = useState(false)

  if (!player) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] max-w-4xl max-h-[85vh] bg-card border-2 border-border rounded-sm shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
          <div>
            <h3 className="text-base font-semibold text-foreground">{player.display_name}</h3>
            <p className="text-xs text-muted-foreground">
              {player.age_group} • {player.fed || 'No Fed'} • {player.totalTournaments} tournaments
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-accent">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        
        <div className="p-4 overflow-auto max-h-[calc(85vh-120px)]">
          {/* Criteria Status */}
          <div className="mb-4">
            <div className="flex items-center gap-1 mb-2 relative">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Selection Criteria</h4>
              <div className="relative">
                <button 
                  onClick={() => setShowPolicyTooltip(!showPolicyTooltip)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CircleQuestionMark className="w-4 h-4" strokeWidth={2.25} />
                </button>
                {showPolicyTooltip && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowPolicyTooltip(false)} 
                    />
                    <div className="absolute left-1/2 top-6 -translate-x-1/2 w-64 p-3 bg-card border-2 border-border rounded-sm shadow-xl z-50 text-xs">
                      <p className="font-semibold text-foreground mb-1">CDC Junior Selection Policy</p>
                      <p className="text-muted-foreground mb-2">To qualify for CDC Junior Selection, a player must:</p>
                      <ul className="text-muted-foreground space-y-1">
                        <li>• Play 6 tournaments in the period</li>
                        <li>• Meet ONE of the following combinations:</li>
                        <li className="ml-2">- 2 Open + 4 Junior Qualifying</li>
                        <li className="ml-2">- 3 Open + 3 Junior Qualifying</li>
                        <li>• Play at least 1 Open tournament in Capricorn/Limpopo region</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              
              {/* Total */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium ${
                player.criteriaNeeded.total.met ? 'text-cyan-600 font-bold' : 'text-red-600 font-bold'
              }`}>
                {player.criteriaNeeded.total.met ? <Check className="w-6 h-6" strokeWidth={3} /> : <X className="w-3.5 h-3.5" strokeWidth={4} />}
                <span>Total: {player.criteriaNeeded.total.current}</span>
              </div>
              
              {/* Open */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium ${
                player.criteriaNeeded.open.met ? 'text-cyan-600 font-bold' : 'text-red-600 font-bold'
              }`}>
                {player.criteriaNeeded.open.met ? <Check className="w-6 h-6" strokeWidth={3} /> : <X className="w-3.5 h-3.5" strokeWidth={4} />}
                <span>Open: {player.criteriaNeeded.open.current}</span>
              </div>
              
              {/* Junior */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium ${
                player.criteriaNeeded.junior.met ? 'text-cyan-600 font-bold' : 'text-red-600 font-bold'
              }`}>
                {player.criteriaNeeded.junior.met ? <Check className="w-6 h-6" strokeWidth={3} /> : <X className="w-3.5 h-3.5" strokeWidth={4} />}
                <span>Junior: {player.criteriaNeeded.junior.current}</span>
              </div>
              
              {/* Capricorn Open */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium ${
                player.criteriaNeeded.capricorn.met ? 'text-cyan-600 font-bold' : 'text-red-600 font-bold'
              }`}>
                {player.criteriaNeeded.capricorn.met ? <Check className="w-6 h-6" strokeWidth={3} /> : <X className="w-3.5 h-3.5" strokeWidth={4} />}
                <span>Capricorn Open</span>
              </div>
            </div>
          </div>
          
          {/* Tournament List */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Tournaments Played</h4>
            <div className="border rounded-sm overflow-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[200px]">Tournament</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-24">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-28">Location</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-20">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-16">Capricorn</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-20">Included</th>
                  </tr>
                </thead>
                <tbody>
                  {player.tournaments.map((t, idx) => (
                    <tr key={idx} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 text-sm max-w-[250px]">
                        <span className="block truncate" title={t.tournament_name}>{t.tournament_name}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{t.date ? new Date(t.date).toLocaleDateString('en-ZA') : '-'}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground max-w-[120px]">
                        <span className="block truncate" title={t.location || ''}>{t.location || '-'}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          t.type === 'junior_qualifying' ? 'bg-amber-50 text-amber-700 ' : 'bg-blue-50 text-blue-700 '
                        }`}>
                          {t.type === 'junior_qualifying' ? 'Junior' : t.type === 'open' ? 'Open' : 'Other'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {t.isCapricorn ? (
                          <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
                        ) : (
                          <X className="w-4 h-4 text-red-500" strokeWidth={4} />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {t.isIncluded ? (
                          <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
                        ) : (
                          <X className="w-4 h-4 text-red-300" strokeWidth={4} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}