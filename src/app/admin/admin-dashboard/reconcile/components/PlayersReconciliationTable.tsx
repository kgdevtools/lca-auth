// src/app/admin/admin-dashboard/reconcile/components/PlayersReconciliationTable.tsx
'use client';

import { UnreconciledPlayer, PlayerMatch } from '@/types/reconciliation';
import { useState } from 'react';
import { Search, Filter, MoreHorizontal, Calculator, Users, UserPlus } from 'lucide-react';
import ResolveMatchModal from './ResolveMatchModal';

interface PlayersReconciliationTableProps {
  players: UnreconciledPlayer[];
}

export default function PlayersReconciliationTable({ players }: PlayersReconciliationTableProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<UnreconciledPlayer | null>(null);
  const [matches, setMatches] = useState<PlayerMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeModal, setActiveModal] = useState<'resolve' | 'calculate' | null>(null);

  const getStatusConfig = (status: string) => {
    const config = {
      no_performance: { label: 'No PR', color: 'bg-amber-100 text-amber-800 border-amber-200' },
      weak_match: { label: 'Weak Match', color: 'bg-orange-100 text-orange-800 border-orange-200' },
      new_player: { label: 'New', color: 'bg-rose-100 text-rose-800 border-rose-200' }
    };
    return config[status as keyof typeof config] || config.no_performance;
  };

  const handleResolveMatch = async (player: UnreconciledPlayer) => {
    setIsLoading(true);
    setSelectedPlayer(player);
    // In a real implementation, we would fetch matches here
    setMatches([]); // Simulated empty matches for now
    setActiveModal('resolve');
    setIsLoading(false);
  };

  const handleCalculatePerformance = (player: UnreconciledPlayer) => {
    setSelectedPlayer(player);
    setActiveModal('calculate');
    // TODO: Implement performance calculation logic
    console.log('Calculate performance for:', player.name);
  };

  return (
    <>
      <div className="bg-card rounded-xl shadow-sm border border-border">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-card-foreground">Unreconciled Players</h2>
            <p className="text-muted-foreground text-sm mt-1">{players.length} records needing attention</p>
          </div>
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search players..."
                className="pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
              />
            </div>
            <button className="p-2 border border-input rounded-lg hover:bg-accent">
              <Filter className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-4 text-left text-sm font-semibold text-card-foreground">Player</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-card-foreground">Tournament</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-card-foreground">Rating</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-card-foreground">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-card-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const statusConfig = getStatusConfig(player.status);
                return (
                  <tr key={player.id} className="border-b border-border last:border-b-0 hover:bg-accent">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-card-foreground text-sm">{player.name}</div>
                        {player.federation && (
                          <div className="text-xs text-muted-foreground">{player.federation}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-card-foreground">{player.tournament_name}</div>
                      <div className="text-xs text-muted-foreground">{player.tournament_date}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-card-foreground">
                        {player.player_rating ? player.player_rating.toLocaleString() : '–'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {player.status === 'no_performance' && (
                          <button
                            onClick={() => handleCalculatePerformance(player)}
                            className="inline-flex items-center px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            <Calculator className="h-3 w-3 mr-1" />
                            Calculate
                          </button>
                        )}
                        {player.status === 'weak_match' && (
                          <button
                            onClick={() => handleResolveMatch(player)}
                            className="inline-flex items-center px-3 py-1.5 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 transition-colors"
                          >
                            <Users className="h-3 w-3 mr-1" />
                            Resolve
                          </button>
                        )}
                        <button className="p-1.5 text-muted-foreground hover:text-card-foreground rounded">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {players.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-2">No unreconciled players found</div>
            <div className="text-sm text-muted-foreground">All players have been successfully reconciled</div>
          </div>
        )}
      </div>

      {/* Modals */}
      {activeModal === 'resolve' && selectedPlayer && (
        <ResolveMatchModal
          player={selectedPlayer}
          matches={matches}
          isLoading={isLoading}
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  );
}
