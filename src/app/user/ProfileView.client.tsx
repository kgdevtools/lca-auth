"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OnboardingModal } from '@/components/user/OnboardingModal'
import { PlayerSearchCombobox } from '@/components/ui/player-search-combobox'
import { Loader2, User, Calendar, Trophy, Target, TrendingUp, ChevronRight, Sparkles, Shield, Zap, Edit3, Award, BookOpen, Users, BarChart3, Check, X } from 'lucide-react'
import type { ProfilePageData, UserGame, PlayerProfile, PlayerMatch, AcademyProgress } from './actions'
import { updateProfile, needsOnboarding } from './actions'
import type { PlayerSearchResult, ActivePlayerData } from './tournament-actions'
import { getActivePlayerData, getPlayerStatistics } from './tournament-actions'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'

interface Props extends ProfilePageData {
  userGames?: UserGame[]
  totalGamesCount?: number
  playerProfile?: PlayerProfile | null
  closeMatches?: PlayerMatch[]
  academyProgress?: AcademyProgress
}

export default function ProfileView({
  user,
  profile,
  profileError,
  activePlayerData,
  playerStats,
  matchResult,
  signOutAction,
  userGames = [],
  totalGamesCount = 0,
  playerProfile = null,
  closeMatches = [],
  academyProgress = { total: 0, completed: 0, inProgress: 0, totalTimeMinutes: 0, averageQuizScore: 0 }
}: Props) {
  const router = useRouter()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  useEffect(() => {
    async function checkOnboarding() {
      const needs = await needsOnboarding()
      setShowOnboarding(needs)
      setOnboardingChecked(true)
    }
    checkOnboarding()
  }, [])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    router.refresh()
  }

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short'
      })
    : 'Unknown'

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [loadingPlayer, setLoadingPlayer] = useState<string | null>(null)
  const [updatedPlayerData, setUpdatedPlayerData] = useState<ActivePlayerData[]>(activePlayerData)
  const [updatedPlayerStats, setUpdatedPlayerStats] = useState(playerStats)
  const [confirmedMatches, setConfirmedMatches] = useState<Set<string>>(new Set())
  const [selectedGame, setSelectedGame] = useState<UserGame | null>(null)
  const [gameFen, setGameFen] = useState<string>('start')
  const chessaIdRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setUpdatedPlayerData(activePlayerData)
    setUpdatedPlayerStats(playerStats)
  }, [activePlayerData, playerStats])

  useEffect(() => {
    if (selectedGame?.pgn) {
      try {
        const chess = new Chess()
        chess.loadPgn(selectedGame.pgn)
        setGameFen(chess.fen())
      } catch {
        setGameFen('start')
      }
    }
  }, [selectedGame])

  const handleSelectPlayer = async (playerName: string, uniqueNo: string) => {
    setLoadingPlayer(playerName)

    try {
      const newPlayerData = await getActivePlayerData(playerName)
      const newPlayerStats = await getPlayerStatistics(playerName)

      if (newPlayerData && newPlayerStats && updatedPlayerStats) {
        const combinedTournaments = [...updatedPlayerData]
        newPlayerData.forEach(newTournament => {
          const exists = combinedTournaments.some(
            existing =>
              existing.tournament_name === newTournament.tournament_name &&
              existing.created_at === newTournament.created_at
          )
          if (!exists) {
            combinedTournaments.push(newTournament)
          }
        })

        const maxLatestRating = Math.max(
          typeof updatedPlayerStats.latestRating === 'number' ? updatedPlayerStats.latestRating : parseInt(updatedPlayerStats.latestRating) || 0,
          typeof newPlayerStats.latestRating === 'number' ? newPlayerStats.latestRating : parseInt(newPlayerStats.latestRating) || 0
        )
        const maxHighestRating = Math.max(
          typeof updatedPlayerStats.highestRating === 'number' ? updatedPlayerStats.highestRating : parseInt(String(updatedPlayerStats.highestRating)) || 0,
          typeof newPlayerStats.highestRating === 'number' ? newPlayerStats.highestRating : parseInt(String(newPlayerStats.highestRating)) || 0
        )
        const calculatedAvgPerformance = (((
          (typeof updatedPlayerStats.avgPerformance === 'number' ? updatedPlayerStats.avgPerformance : parseFloat(String(updatedPlayerStats.avgPerformance)) || 0) * updatedPlayerStats.tournaments
        ) + (
          (typeof newPlayerStats.avgPerformance === 'number' ? newPlayerStats.avgPerformance : parseFloat(String(newPlayerStats.avgPerformance)) || 0) * newPlayerStats.tournaments
        )) / (updatedPlayerStats.tournaments + newPlayerStats.tournaments))

        const combinedStats = {
          totalGames: updatedPlayerStats.totalGames + newPlayerStats.totalGames,
          tournaments: updatedPlayerStats.tournaments + newPlayerStats.tournaments,
          latestRating: String(maxLatestRating),
          highestRating: maxHighestRating,
          avgPerformance: calculatedAvgPerformance,
          federation: updatedPlayerStats.federation || newPlayerStats.federation,
          chessaId: uniqueNo || updatedPlayerStats.chessaId || newPlayerStats.chessaId
        }

        setUpdatedPlayerData(combinedTournaments)
        setUpdatedPlayerStats(combinedStats)
        setSelectedPlayer(playerName)
        setConfirmedMatches(prev => new Set(prev).add(playerName))

        if (uniqueNo && chessaIdRef.current) {
          chessaIdRef.current.value = uniqueNo
          const event = new Event('input', { bubbles: true })
          chessaIdRef.current.dispatchEvent(event)
        }
      }
    } catch (error) {
      // Error handled silently
    } finally {
      setLoadingPlayer(null)
    }
  }

  if (!onboardingChecked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isCoach = profile?.role === 'coach' || profile?.role === 'admin'
  const isAdmin = profile?.role === 'admin'

  return (
    <>
      <OnboardingModal 
        open={showOnboarding} 
        userEmail={user.email || ''} 
        onComplete={handleOnboardingComplete}
      />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Personalized Welcome Header */}
        <div className="mb-8">
          <div className="flex items-baseline gap-3 mb-1">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter leading-none text-gray-900 dark:text-gray-100">
              Welcome back,
            </h1>
            <span className="text-4xl sm:text-5xl font-bold tracking-tighter leading-none bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              {profile?.full_name?.split(' ')[0] || profile?.tournament_fullname?.split(' ')[0] || 'there'}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 tracking-tight leading-tight">
            Your chess journey continues
          </p>
        </div>

        {profileError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-sm">
            <p className="text-sm text-red-700 dark:text-red-300">{profileError}</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Profile Hero */}
          <div className="lg:col-span-1 space-y-4">
            {/* Profile Hero Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 rounded-sm p-6">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
              
              <div className="relative flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <Avatar
                    name={profile?.full_name || profile?.tournament_fullname || user.email || 'User'}
                    size={96}
                    className="ring-4 ring-white/20 shadow-2xl"
                  />
                  <Badge className="absolute -bottom-1 -right-1 bg-blue-500 hover:bg-blue-600 border-0 px-2 py-0.5 text-[10px] gap-1">
                    <Shield className="w-3 h-3" />
                    {profile?.role || 'Student'}
                  </Badge>
                </div>
                
                <h2 className="text-xl font-bold text-white tracking-tight leading-tight mb-1">
                  {profile?.full_name || profile?.tournament_fullname || 'User'}
                </h2>
                
                <p className="text-sm text-gray-400 tracking-tight leading-tight mb-4">
                  {user.email}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {memberSince}
                  </span>
                  {profile?.chessa_id && (
                    <span className="flex items-center gap-1 font-mono">
                      <Zap className="w-3 h-3" />
                      {profile.chessa_id}
                    </span>
                  )}
                </div>

                {/* Edit Profile CTA */}
                <Link 
                  href="/user/profile"
                  className="mt-5 w-full group"
                >
                  <Button 
                    variant="outline" 
                    className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] tracking-tight leading-tight rounded-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-2 group-hover:rotate-12 transition-transform" />
                    Edit Profile
                  </Button>
                </Link>
              </div>
            </div>

            {/* Player Profile Details - if tournament name set */}
            {playerProfile && (
              <Card className="border-0 bg-white dark:bg-slate-900/50 shadow-sm rounded-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="font-semibold text-sm tracking-tight leading-tight flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    Player Record
                  </h3>
                </div>
                <CardContent className="p-4 space-y-3">
                  {playerProfile.title && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Title</span>
                      <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                        {playerProfile.title}
                      </Badge>
                    </div>
                  )}
                  {playerProfile.rating && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Rating</span>
                      <span className="text-sm font-mono font-semibold">{playerProfile.rating}</span>
                    </div>
                  )}
                  {playerProfile.fed && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Federation</span>
                      <span className="text-sm font-medium">{playerProfile.fed}</span>
                    </div>
                  )}
                  {playerProfile.sex && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Sex</span>
                      <span className="text-sm font-medium">{playerProfile.sex}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Tournament Name Update */}
            <Card className="border-0 bg-white dark:bg-slate-900/50 shadow-sm rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-semibold text-sm tracking-tight leading-tight flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-purple-500" />
                  Tournament Name
                </h3>
              </div>
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-3">
                  Search Player Profile
                </p>
                <PlayerSearchRow
                  name="tournament_fullname"
                  defaultValue={profile?.tournament_fullname ?? ''}
                  updateAction={updateProfile}
                  chessaIdRef={chessaIdRef}
                  onPlayerSelect={handleSelectPlayer}
                />
              </CardContent>
            </Card>

            {/* Is This You? - Close Matches */}
            {closeMatches.length > 0 && (
              <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 shadow-sm rounded-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-amber-100 dark:border-amber-800/50">
                  <h3 className="font-semibold text-sm tracking-tight leading-tight flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <Award className="w-4 h-4" />
                    Is this also you?
                  </h3>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                    We found similar player names. Click to consolidate data.
                  </p>
                </div>
                <CardContent className="p-3 space-y-2">
                  {closeMatches.slice(0, 3).map((match, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectPlayer(match.name, match.unique_no || '')}
                      disabled={loadingPlayer === match.name}
                      className="w-full p-2.5 rounded-sm bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 transition-colors text-left disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {match.name}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {match.rating ? `Rating: ${match.rating}` : ''} {match.fed ? `• ${match.fed}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {loadingPlayer === match.name && (
                            <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                          )}
                          <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400">
                            {(match.score * 100).toFixed(0)}% match
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Academy Progress - Actual Data */}
            <Card className="border-0 bg-white dark:bg-slate-900/50 shadow-sm rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-semibold text-sm tracking-tight leading-tight flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  Academy Progress
                </h3>
              </div>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                    <p className="text-[10px] uppercase tracking-wider text-green-600 dark:text-green-400 mb-1">Completed</p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-300">{academyProgress.completed}</p>
                  </div>
                  <div className="p-3 rounded-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <p className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">In Progress</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{academyProgress.inProgress}</p>
                  </div>
                  <div className="p-3 rounded-sm bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                    <p className="text-[10px] uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">Time Spent</p>
                    <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{academyProgress.totalTimeMinutes}m</p>
                  </div>
                  <div className="p-3 rounded-sm bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                    <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Avg Score</p>
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                      {academyProgress.averageQuizScore > 0 ? `${academyProgress.averageQuizScore}%` : '—'}
                    </p>
                  </div>
                </div>
                {isAdmin || isCoach ? (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <Link href="/academy/reports" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
                      View Full Reports
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                    <Link href="/academy/lessons" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
                      Lessons
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                    <Link href="/academy/reports" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
                      My Progress
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Stats & Tournaments */}
          <div className="lg:col-span-2 space-y-4">
            {/* Stats Grid */}
            {updatedPlayerStats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard 
                  icon={<Target className="w-4 h-4" />}
                  label="Games Played"
                  value={totalGamesCount}
                />
                <StatCard 
                  icon={<Trophy className="w-4 h-4" />}
                  label="Tournaments"
                  value={updatedPlayerStats.tournaments}
                />
                <StatCard 
                  icon={<TrendingUp className="w-4 h-4" />}
                  label="Rating"
                  value={updatedPlayerStats.latestRating}
                  highlight
                />
                <StatCard 
                  icon={<Sparkles className="w-4 h-4" />}
                  label="Highest"
                  value={updatedPlayerStats.highestRating}
                />
                <StatCard 
                  icon={<Zap className="w-4 h-4" />}
                  label="Avg Performance"
                  value={typeof updatedPlayerStats.avgPerformance === 'number' 
                    ? updatedPlayerStats.avgPerformance.toFixed(1) 
                    : updatedPlayerStats.avgPerformance}
                />
                {updatedPlayerStats.federation && (
                  <StatCard 
                    icon={<User className="w-4 h-4" />}
                    label="Federation"
                    value={updatedPlayerStats.federation}
                  />
                )}
              </div>
            )}

            {/* Recent Tournaments - Condensed Table */}
            {updatedPlayerData && updatedPlayerData.length > 0 && (
              <Card className="border-0 bg-white dark:bg-slate-900/50 shadow-sm rounded-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="font-semibold text-sm tracking-tight leading-tight">Recent Tournaments</h3>
                  <Link href="/tournaments" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
                    View All
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {updatedPlayerData.slice(0, 5).map((tournament, idx) => (
                    <div 
                      key={idx} 
                      className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate tracking-tight leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {tournament.tournament_name || 'Unknown Tournament'}
                        </p>
                        <p className="text-[11px] text-gray-400 tracking-tight leading-tight">
                          {tournament.created_at 
                            ? new Date(tournament.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'No date'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        {tournament.RATING || tournament.player_rating ? (
                          <span className="font-mono font-medium text-gray-600 dark:text-gray-300">
                            {tournament.RATING || tournament.player_rating}
                          </span>
                        ) : null}
                        {tournament.performance_rating && (
                          <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-sm text-[10px] font-medium">
                            {tournament.performance_rating}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recent Games */}
            {userGames.length > 0 && (
              <Card className="border-0 bg-white dark:bg-slate-900/50 shadow-sm rounded-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm tracking-tight leading-tight">My Games</h3>
                    <Badge variant="outline" className="text-[10px] rounded-sm">
                      {userGames.length}
                    </Badge>
                  </div>
                  <Link href="/user/tournament-games" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
                    All Games
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {userGames.slice(0, 5).map((game) => {
                    const playerName = profile?.tournament_fullname || ''
                    const nameTokens = playerName.toLowerCase().split(' ').filter(t => t.length > 1)
                    const isWhite = nameTokens.length > 0 && nameTokens.some(t => game.white.toLowerCase().includes(t))
                    const isBlack = nameTokens.length > 0 && nameTokens.some(t => game.black.toLowerCase().includes(t))
                    
                    return (
                      <button 
                        key={game.id}
                        onClick={() => setSelectedGame(game)}
                        className="w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors flex items-center gap-4 group text-left"
                      >
                        <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                            {game.result || '*'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
                            <span className={isWhite ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}>{game.white}</span>
                            {' vs '}
                            <span className={isBlack ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}>{game.black}</span>
                          </p>
                          <p className="text-[11px] text-gray-400 tracking-tight leading-tight">
                            {game.tournament} • {game.created_at 
                              ? new Date(game.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : 'No date'}
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] shrink-0 rounded-sm ${
                            game.result === '1-0' ? 'text-green-600 dark:text-green-400' :
                            game.result === '0-1' ? 'text-red-600 dark:text-red-400' :
                            game.result === '1/2-1/2' ? 'text-gray-600 dark:text-gray-400' : ''
                          }`}
                        >
                          {game.result || '*'}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* Chessboard Preview */}
            {userGames.length > 0 && selectedGame && (
              <Card className="border-0 bg-white dark:bg-slate-900/50 shadow-sm rounded-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="font-semibold text-sm tracking-tight leading-tight">Last Position</h3>
                  <button
                    onClick={() => setSelectedGame(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="w-full sm:w-48 shrink-0">
                      <Chessboard 
                        position={gameFen} 
                        boardWidth={Math.min(180, window.innerWidth - 80)}
                        arePiecesDraggable={false}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {selectedGame.white} vs {selectedGame.black}
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        {selectedGame.tournament}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-[10px] rounded-sm">
                          {selectedGame.result || '*'}
                        </Badge>
                        {selectedGame.created_at && (
                          <span className="text-[10px] text-gray-400">
                            {new Date(selectedGame.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Data Message */}
            {profile?.tournament_fullname && (!activePlayerData || activePlayerData.length === 0) && !playerStats && (
              <Card className="border-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 shadow-sm rounded-sm">
                <CardContent className="p-6 text-center">
                  <Trophy className="w-8 h-8 mx-auto mb-3 text-blue-500 opacity-50" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 tracking-tight leading-tight">
                    No tournament data found for{" "}
                    <span className="font-semibold">"{profile.tournament_fullname}"</span>
                    <br />
                    <span className="text-xs">Search for your player profile above to link your data</span>
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function StatCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`
      relative overflow-hidden rounded-sm p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
      ${highlight 
        ? 'bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-lg shadow-slate-500/10' 
        : 'bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md'
      }
    `}>
      <div className={`flex items-center gap-2 mb-2 ${highlight ? 'text-gray-400' : 'text-gray-400'}`}>
        {icon}
        <span className="text-[10px] uppercase tracking-widest font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold tracking-tighter leading-none ${highlight ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </p>
    </div>
  )
}

function PlayerSearchRow({
  name,
  defaultValue,
  updateAction,
  chessaIdRef,
  onPlayerSelect
}: {
  name: string
  defaultValue: string
  updateAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>
  chessaIdRef: React.RefObject<HTMLInputElement | null>
  onPlayerSelect?: (playerName: string, uniqueNo: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(defaultValue)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUniqueNo, setSelectedUniqueNo] = useState<string | null>(null)

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    if (selectedUniqueNo && chessaIdRef.current) {
      formData.set('chessa_id', selectedUniqueNo)
    }

    try {
      const result = await updateAction(formData)
      if (result.success) {
        setEditing(false)
        window.location.reload()
      } else {
        setError(result.error || 'Failed to update')
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePlayerSelect = (player: PlayerSearchResult) => {
    setValue(player.name)
    if (player.unique_no) {
      setSelectedUniqueNo(player.unique_no)
      if (chessaIdRef.current) {
        chessaIdRef.current.value = player.unique_no
        const event = new Event('input', { bubbles: true })
        chessaIdRef.current.dispatchEvent(event)
      }
    }
    if (onPlayerSelect) {
      onPlayerSelect(player.name, player.unique_no || '')
    }
  }

  return (
    <div>
      {!editing ? (
        <div className="flex items-center justify-between">
          <p className={`text-sm font-medium ${value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'} tracking-tight leading-tight`}>
            {value || 'Not set - click to search'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
            onClick={() => setEditing(true)}
          >
            {value ? 'Update' : 'Search'}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <PlayerSearchCombobox
            value={value}
            onValueChange={setValue}
            onPlayerSelect={handlePlayerSelect}
            placeholder="Search for a player..."
            className="w-full"
          />
          <input type="hidden" name={name} value={value} />
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(false)
                setValue(defaultValue)
                setError(null)
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
        </form>
      )}
    </div>
  )
}
