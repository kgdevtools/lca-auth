// src/app/admin/admin-dashboard/reconcile/components/ResolveMatchModal.tsx
'use client';

import { UnreconciledPlayer, PlayerMatch } from '@/types/reconciliation';
import { X, Check, User, Star, Crosshair } from 'lucide-react';

interface ResolveMatchModalProps {
  player: UnreconciledPlayer;
  matches: PlayerMatch[];
  isLoading: boolean;
  onClose: () => void;
}

export default function ResolveMatchModal({ 
  player, 
  matches, 
  isLoading, 
  onClose 
}: ResolveMatchModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Resolve Weak Match</h2>
            <p className="text-slate-600 mt-1">Review and confirm the best match for {player.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {/* Current Player Info */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Current Player
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-slate-600">Name</div>
                <div className="font-semibold text-slate-900">{player.name}</div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Rating</div>
                <div className="font-semibold text-slate-900">
                  {player.player_rating || '–'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Federation</div>
                <div className="font-semibold text-slate-900">
                  {player.federation || '–'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Weak Match</div>
                <div className="font-semibold text-orange-600">
                  {player.weak_match_value || '–'}
                </div>
              </div>
            </div>
          </div>

          {/* Potential Matches */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
              <Crosshair className="h-4 w-4 mr-2" />
              Potential Matches
            </h3>
            
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-slate-100 rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded mb-2 w-1/3"></div>
                    <div className="h-6 bg-slate-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No potential matches found. This might be a new player.
              </div>
            ) : (
              <div className="grid gap-3">
                {matches.map((match, index) => (
                  <div key={match.id} className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 font-semibold text-sm">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{match.name}</div>
                          <div className="text-sm text-slate-600">{match.source}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          {Math.round(match.similarity_score * 100)}% match
                        </span>
                        <button className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors">
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Rating: </span>
                        <span className="font-medium">{match.rating || '–'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Federation: </span>
                        <span className="font-medium">{match.federation || '–'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Similarity: </span>
                        <span className="font-medium">{Math.round(match.similarity_score * 100)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-6 mt-6 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
              Mark as New Player
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
