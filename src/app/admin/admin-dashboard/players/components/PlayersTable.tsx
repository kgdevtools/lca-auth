"use client"

import { useEffect, useState } from "react"
import { getPlayersNeedingReconciliation, getPlayerStats } from "../server-actions"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { Edit2, Trash2, Eye, Settings } from "lucide-react"

interface PerformanceStat {
  tournament_name: string
  player_name: string
  confidence: number
  points: number
  total_wins: number
  total_draws: number
  total_losses: number
  total_rounds: number
  player_rating?: number
  performance_rating?: number
  classifications?: Record<string, any>
}

interface Player {
  id: string
  lim_id: string
  normalized_name: string
  federation?: string
  cf_rating?: number
  confidence_score?: number
  is_reconciled: boolean
  performance_stats?: PerformanceStat[]
  source_records?: string[]
  created_at?: string
  updated_at?: string
}

export default function PlayersTable() {
  const [players, setPlayers] = useState<Player[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [playersData, statsData] = await Promise.all([getPlayersNeedingReconciliation(), getPlayerStats()])
      setPlayers(playersData || [])
      setStats(statsData)
      setLoading(false)
    }

    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-sm font-semibold tracking-tight text-muted-foreground">
                Total Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tracking-tight text-foreground">{stats.total_count}</p>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-sm font-semibold tracking-tight text-destructive">
                Needs Reconciliation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tracking-tight text-destructive">{stats.reconciliation_needed_count}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-lg font-semibold tracking-tight leading-tight">
            Players That Need Reconciliation
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-1/4 rounded bg-muted" />
              <div className="h-4 w-1/2 rounded bg-muted" />
              <div className="h-4 w-3/4 rounded bg-muted" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold uppercase text-xs text-muted-foreground">ID</TableHead>
                  <TableHead className="font-bold uppercase text-xs text-muted-foreground">Normalized Name</TableHead>
                  <TableHead className="font-bold uppercase text-xs text-muted-foreground">Federation</TableHead>
                  <TableHead className="font-bold uppercase text-xs text-muted-foreground">CF Rating</TableHead>
                  <TableHead className="font-bold uppercase text-xs text-muted-foreground">Confidence</TableHead>
                  <TableHead className="font-bold uppercase text-xs text-muted-foreground">Reconciled?</TableHead>
                  <TableHead className="font-bold uppercase text-xs text-muted-foreground">Performance Stats</TableHead>
                  <TableHead className="font-bold uppercase text-xs text-muted-foreground">Source Records</TableHead>
                  <TableHead className="font-bold uppercase text-xs text-muted-foreground">Created</TableHead>
                  <TableHead className="font-bold uppercase text-xs text-muted-foreground">Updated</TableHead>
                  <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground">
                      No players need reconciliation 🎉
                    </TableCell>
                  </TableRow>
                ) : (
                  players.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell className="max-w-xs truncate text-muted-foreground text-xs">{p.lim_id}</TableCell>
                      <TableCell className="font-bold text-foreground text-sm">{p.normalized_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.federation ?? "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.cf_rating ?? "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.confidence_score ?? "-"}</TableCell>
                      <TableCell>
                        {p.is_reconciled ? (
                          <Badge variant="outline" className="bg-chart-2/20 text-chart-2 border-chart-2/30">
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30">
                            No
                          </Badge>
                        )}
                      </TableCell>

                      {/* Performance stats shown compact with modal */}
                      <TableCell>
                        {p.performance_stats && p.performance_stats.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {p.performance_stats.map((stat: PerformanceStat, idx: number) => (
                              <Dialog key={idx}>
                                <DialogTrigger asChild>
                                  <Card className="cursor-pointer hover:shadow-sm transition text-xs border-2 hover:border-primary/50 rounded-sm flex-1 min-w-0 w-full">
                                    <CardContent className="p-2">
                                      <p className="font-semibold text-foreground text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                                        {stat.tournament_name}
                                      </p>
                                      <p className="text-muted-foreground text-[10px] overflow-hidden text-ellipsis whitespace-nowrap">
                                        {stat.points} pts, Rating: {stat.player_rating ?? "-"}
                                      </p>
                                    </CardContent>
                                  </Card>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle>{stat.tournament_name}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-2 text-sm">
                                    <p>
                                      Player: <span className="font-medium">{stat.player_name}</span>
                                    </p>
                                    <p>Confidence: {stat.confidence}</p>
                                    <p>
                                      Points: {stat.points}, Wins: {stat.total_wins}, Draws: {stat.total_draws}, Losses:{" "}
                                      {stat.total_losses}, Rounds: {stat.total_rounds}
                                    </p>
                                    <p>Player Rating: {stat.player_rating ?? "-"}</p>
                                    <p>Performance Rating: {stat.performance_rating ?? "-"}</p>
                                    {stat.classifications && (
                                      <div>
                                        <p className="font-semibold">Classifications</p>
                                        <div className="flex flex-wrap gap-1">
                                          {Object.entries(stat.classifications).map(([key, value]) => (
                                            <Badge key={key} variant="secondary">
                                              {key}: {String(value)}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>

                      {/* Source Records */}
                      <TableCell>
                        {p.source_records && p.source_records.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.source_records.map((src: string, idx: number) => (
                              <Badge key={idx} variant="secondary">
                                {src}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "-"}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 flex items-center justify-center text-primary hover:text-primary/80 hover:bg-primary/10"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 flex items-center justify-center text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 flex items-center justify-center text-chart-2 hover:text-chart-2/80 hover:bg-chart-2/10"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
