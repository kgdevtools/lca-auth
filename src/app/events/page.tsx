"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, MapPin, Clock, User, Trophy, ChevronLeft, ChevronRight } from "lucide-react"
import tournamentsData from "@/data/tournaments.json"

type Tournament = typeof tournamentsData[0]

const statusColors: Record<string, { bg: string; text: string; bgPast: string; textPast: string }> = {
  Open: { bg: "bg-emerald-500", text: "text-white", bgPast: "bg-emerald-200", textPast: "text-emerald-600" },
  Junior: { bg: "bg-sky-500", text: "text-white", bgPast: "bg-sky-200", textPast: "text-sky-600" },
  Closed: { bg: "bg-amber-500", text: "text-white", bgPast: "bg-amber-200", textPast: "text-amber-600" },
  Youth: { bg: "bg-rose-500", text: "text-white", bgPast: "bg-rose-200", textPast: "text-rose-600" },
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function TournamentCard({
  tournament,
  onClick,
  isPast,
}: { tournament: Tournament; onClick: () => void; isPast: boolean }) {
  const colors = statusColors[tournament.status] || statusColors.Open

  return (
    <button
      onClick={onClick}
      className={`absolute inset-0 w-full h-full text-left p-1.5 md:p-2 pt-6 md:pt-7 lg:pt-8 transition-all duration-200 cursor-pointer group ${
        isPast ? `${colors.bgPast} opacity-60` : `${colors.bg} hover:shadow-lg hover:brightness-110`
      }`}
    >
      <p
        className={`text-[10px] md:text-xs font-medium ${isPast ? colors.textPast : colors.text} line-clamp-2 group-hover:line-clamp-none`}
      >
        {tournament.name}
      </p>
      <div className="flex items-center gap-1 mt-0.5">
        <Clock className={`w-2.5 h-2.5 md:w-3 md:h-3 ${isPast ? colors.textPast : colors.text} opacity-80`} />
        <span className={`text-[8px] md:text-[10px] ${isPast ? colors.textPast : colors.text} opacity-90`}>
          {tournament.timeControl}
        </span>
      </div>
      {isPast && <span className={`text-[8px] ${colors.textPast} font-medium mt-0.5 block`}>Completed</span>}
    </button>
  )
}

function DayCell({
  day,
  month,
  year,
  dayTournaments,
  onTournamentClick,
}: {
  day: number
  month: number
  year: number
  dayTournaments: Tournament[]
  onTournamentClick: (tournament: Tournament) => void
}) {
  const today = new Date()
  const cellDate = new Date(year, month, day)
  const isToday = today.toDateString() === cellDate.toDateString()
  const hasEvents = dayTournaments.length > 0

  const isPast = cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const firstTournament = dayTournaments[0]
  const colors = firstTournament ? statusColors[firstTournament.status] || statusColors.Open : null

  return (
    <div
      className={`min-h-20 md:min-h-28 lg:min-h-32 border border-border/40 rounded-sm relative overflow-hidden ${
        hasEvents
          ? isPast
            ? colors?.bgPast
            : colors?.bg
          : isToday
            ? "bg-primary/10 ring-2 ring-primary/30"
            : isPast
              ? "bg-muted/20"
              : "bg-card"
      }`}
    >
      <span
        className={`absolute top-1 left-1.5 text-base md:text-lg lg:text-xl font-bold z-30 px-1 rounded ${
          hasEvents
            ? isPast
              ? `${colors?.textPast} bg-white/50`
              : "text-white bg-black/20"
            : isToday
              ? "text-primary"
              : isPast
                ? "text-muted-foreground/50"
                : "text-foreground"
        }`}
      >
        {day}
      </span>

      {hasEvents && (
        <>
          {dayTournaments.slice(0, 1).map((tournament) => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              onClick={() => onTournamentClick(tournament)}
              isPast={isPast}
            />
          ))}
          {dayTournaments.length > 1 && (
            <p
              className={`absolute bottom-1 right-1 text-[9px] md:text-[10px] font-semibold z-30 px-1 rounded ${
                isPast ? `${colors?.textPast} bg-white/50` : "text-white bg-black/20"
              }`}
            >
              +{dayTournaments.length - 1} more
            </p>
          )}
        </>
      )}
    </div>
  )
}

function TournamentModal({
  tournament,
  open,
  onOpenChange,
}: {
  tournament: Tournament | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!tournament) return null

  const colors = statusColors[tournament.status] || statusColors.Open
  const today = new Date()
  const tournamentDate = new Date(tournament.endDate)
  const isPast = tournamentDate < today

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[540px] lg:max-w-[650px] mx-auto bg-background/95 backdrop-blur-md border-border/50">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="text-lg lg:text-xl font-semibold leading-tight pr-6">{tournament.name}</DialogTitle>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={`${colors.bg} ${colors.text} border-0`}>{tournament.status}</Badge>
            {isPast && (
              <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                Completed
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 lg:space-y-5 mt-4 lg:mt-5">
          <div className="grid grid-cols-2 gap-4 lg:gap-6">
            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-start gap-2 lg:gap-3">
                <Calendar className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Date</p>
                  <p className="text-sm lg:text-base font-medium">
                    {new Date(tournament.startDate).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {tournament.startDate !== tournament.endDate && (
                      <>
                        {" "}
                        - {new Date(tournament.endDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 lg:gap-3">
                <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Time Control</p>
                  <p className="text-sm lg:text-base font-medium">{tournament.timeControl}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 lg:gap-3">
                <Trophy className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Rounds</p>
                  <p className="text-sm lg:text-base font-medium">{tournament.rounds} rounds</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-start gap-2 lg:gap-3">
                <MapPin className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Venue</p>
                  <p className="text-sm lg:text-base font-medium">{tournament.venue}</p>
                  <p className="text-xs lg:text-sm text-muted-foreground">{tournament.town}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 lg:gap-3">
                <User className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Organiser</p>
                  <p className="text-sm lg:text-base font-medium">{tournament.organiser}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 lg:pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm lg:text-base">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">
                {tournament.days} day{tournament.days > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm lg:text-base mt-1">
              <span className="text-muted-foreground">District</span>
              <span className="font-medium">{tournament.district}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function ChessCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1))
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const tournamentsByDate = useMemo(() => {
    const map = new Map<string, Tournament[]>()
    tournamentsData.forEach((tournament) => {
      const date = tournament.startDate
      if (!map.has(date)) {
        map.set(date, [])
      }
      map.get(date)!.push(tournament)
    })
    return map
  }, [])

  const monthTournaments = useMemo(() => {
    return tournamentsData.filter((t) => {
      const startDate = new Date(t.startDate)
      return startDate.getFullYear() === year && startDate.getMonth() === month
    })
  }, [year, month])

  const handleTournamentClick = (tournament: Tournament) => {
    setSelectedTournament(tournament)
    setModalOpen(true)
  }

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(year, month + direction, 1))
  }

  const days = []
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="min-h-20 md:min-h-28 lg:min-h-32" />)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const dayTournaments = tournamentsByDate.get(dateString) || []

    days.push(
      <DayCell
        key={day}
        day={day}
        month={month}
        year={year}
        dayTournaments={dayTournaments}
        onTournamentClick={handleTournamentClick}
      />,
    )
  }

  const today = new Date()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Chess Tournament Calendar
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Capricorn District Chess - 2025-2026 Season</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 rounded-sm hover:bg-accent transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-lg font-semibold min-w-40 text-center">
                {monthNames[month]} {year}
              </span>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 rounded-sm hover:bg-accent transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-muted-foreground font-medium">Status:</span>
            {Object.entries(statusColors).map(([status, colors]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-sm ${colors.bg}`} />
                <span className="text-foreground font-medium">{status}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border">
              <div className="w-3 h-3 rounded-sm bg-muted opacity-60" />
              <span className="text-muted-foreground">Past Event</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-md border border-border shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {dayNames.map((day) => (
              <div key={day} className="p-2 md:p-3 lg:p-4 text-center bg-zinc-800 dark:bg-zinc-900">
                <span className="hidden sm:inline text-sm md:text-base font-bold text-white">{day}</span>
                <span className="sm:hidden text-sm font-bold text-white">{day.charAt(0)}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-border/30 p-1">{days}</div>
        </div>

        {monthTournaments.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Events this month ({monthTournaments.length})
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {monthTournaments.map((tournament) => {
                const colors = statusColors[tournament.status] || statusColors.Open
                const tournamentDate = new Date(tournament.endDate)
                const isPast = tournamentDate < today

                return (
                  <button
                    key={tournament.id}
                    onClick={() => handleTournamentClick(tournament)}
                    className={`p-3 rounded-sm text-left transition-all ${
                      isPast ? `${colors.bgPast} opacity-70` : `${colors.bg} hover:shadow-lg hover:brightness-110`
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${isPast ? colors.textPast : colors.text}`}>
                        {tournament.name}
                      </p>
                      <span
                        className={`text-[10px] shrink-0 font-medium px-1.5 py-0.5 rounded-sm ${
                          isPast ? "bg-white/40 text-inherit" : "bg-white/20 text-white"
                        }`}
                      >
                        {isPast ? "Done" : tournament.status}
                      </span>
                    </div>
                    <div
                      className={`flex items-center gap-3 mt-2 text-xs ${isPast ? colors.textPast : `${colors.text} opacity-90`}`}
                    >
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(tournament.startDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {tournament.town}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <TournamentModal tournament={selectedTournament} open={modalOpen} onOpenChange={setModalOpen} />
      </div>
    </div>
  )
}