import { getCurrentUserWithProfile } from "@/utils/auth/academyAuth";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AcademyDashboardClient from "@/components/academy/AcademyDashboardClient";

export default async function AcademyDashboard() {
  const { user, profile } = await getCurrentUserWithProfile();
  if (!profile) redirect("/login");
  if (!profile.role) redirect("/forms");

  const supabase = await createClient();

  // ── Defaults ──────────────────────────────────────────────────────────────
  let gamification: {
    totalPoints: number; level: number; currentStreak: number; lessonsCompleted: number
  } | null = null;

  let coachName: string | null = null;
  let coachAssigned = false;

  let lessonSummary: {
    totalAssigned: number;
    completed: number;
    inProgress: number;
    inProgressLessons: { id: string; title: string; lastAccessed: string | null }[];
    recentlyCompleted: { id: string; title: string; completedAt: string | null; quizScore: number | null }[];
  } | null = null;

  let playerRating: string | null = null;
  let playerFed: string | null = null;

  let coachStudentsCount = 0;
  let coachStudentsSummary: {
    id: string; full_name: string | null; lessonsCompleted: number; totalPoints: number; level: number
  }[] = [];

  let activeClassroomSession: { id: string; title: string } | null = null;

  let totalStudentsCount = 0;
  let totalCoachesCount = 0;

  // ── Student ───────────────────────────────────────────────────────────────
  if (profile.role === "student") {
    // Round 1 — all independent queries in parallel
    const [
      { data: summary },
      { data: coachRow },
      { data: assignments },
      { data: progressRows },
    ] = await Promise.all([
      supabase
        .from("student_progress_summary")
        .select("total_points, level, current_streak_days, lessons_completed")
        .eq("student_id", profile.id)
        .single(),
      supabase
        .from("coach_students")
        .select("coach_id, coach_name")
        .eq("student_id", profile.id)
        .maybeSingle(),
      supabase
        .from("lesson_students")
        .select("lesson_id, lesson:lessons(id, title)")
        .eq("student_id", profile.id),
      supabase
        .from("lesson_progress")
        .select("lesson_id, status, last_accessed_at, completed_at, quiz_score")
        .eq("student_id", profile.id),
    ]);

    // Round 2 — player stats + active classroom session
    const [{ data: playerRow }, { data: liveSession }] = await Promise.all([
      profile.tournament_fullname
        ? supabase
            .from("active_players_august_2025_profiles")
            .select("RATING, FED")
            .ilike("name", profile.tournament_fullname)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      coachRow?.coach_id
        ? supabase
            .from("classroom_sessions")
            .select("id, title")
            .eq("coach_id", coachRow.coach_id)
            .eq("status", "active")
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (liveSession) activeClassroomSession = liveSession as { id: string; title: string };

    // Gamification
    if (summary) {
      gamification = {
        totalPoints:      summary.total_points        ?? 0,
        level:            summary.level               ?? 1,
        currentStreak:    summary.current_streak_days  ?? 0,
        lessonsCompleted: summary.lessons_completed    ?? 0,
      };
    }

    // Coach — read directly from the denormalised column
    coachAssigned = !!coachRow;
    coachName     = (coachRow as any)?.coach_name ?? null;

    // Player stats
    playerRating = (playerRow as any)?.RATING ?? null;
    playerFed    = (playerRow as any)?.FED    ?? null;

    // Lesson summary — merge assignments with progress
    const progressMap = new Map(
      (progressRows ?? []).map(p => [p.lesson_id, p])
    );

    const lessonList = (assignments ?? [])
      .map((row: any) => {
        const lesson   = row.lesson as { id: string; title: string } | null;
        if (!lesson?.id) return null;
        const progress = progressMap.get(lesson.id);
        return {
          id:          lesson.id,
          title:       lesson.title as string,
          status:      (progress?.status as string) ?? "not_started",
          lastAccessed: progress?.last_accessed_at ?? null,
          completedAt:  progress?.completed_at     ?? null,
          quizScore:    progress?.quiz_score        ?? null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const inProgressLessons = lessonList
      .filter(l => l.status === "in_progress")
      .sort((a, b) => (b.lastAccessed ?? "").localeCompare(a.lastAccessed ?? ""))
      .slice(0, 3)
      .map(l => ({ id: l.id, title: l.title, lastAccessed: l.lastAccessed }));

    const recentlyCompleted = lessonList
      .filter(l => l.status === "completed")
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, 3)
      .map(l => ({ id: l.id, title: l.title, completedAt: l.completedAt, quizScore: l.quizScore }));

    lessonSummary = {
      totalAssigned:    lessonList.length,
      completed:        lessonList.filter(l => l.status === "completed").length,
      inProgress:       inProgressLessons.length,
      inProgressLessons,
      recentlyCompleted,
    };
  }

  // ── Coach ─────────────────────────────────────────────────────────────────
  if (profile.role === "coach") {
    const [{ count, data: coachStudentRows }, { data: coachLiveSession }] = await Promise.all([
      supabase
        .from("coach_students")
        .select("student_id", { count: "exact" })
        .eq("coach_id", profile.id)
        .limit(5),
      supabase
        .from("classroom_sessions")
        .select("id, title")
        .eq("coach_id", profile.id)
        .eq("status", "active")
        .maybeSingle(),
    ]);

    if (coachLiveSession) activeClassroomSession = coachLiveSession as { id: string; title: string };

    coachStudentsCount = count ?? 0;

    if (coachStudentRows && coachStudentRows.length > 0) {
      const studentIds = coachStudentRows.map(r => r.student_id);

      const [{ data: studentProfiles }, { data: summaries }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", studentIds),
        supabase
          .from("student_progress_summary")
          .select("student_id, total_points, level, lessons_completed")
          .in("student_id", studentIds),
      ]);

      const profileMap = new Map((studentProfiles ?? []).map(p => [p.id, p]));
      const summaryMap = new Map((summaries       ?? []).map(s => [s.student_id, s]));

      coachStudentsSummary = studentIds.map(sid => {
        const p = profileMap.get(sid);
        const s = summaryMap.get(sid);
        return {
          id:               sid,
          full_name:        p?.full_name        ?? null,
          lessonsCompleted: s?.lessons_completed ?? 0,
          totalPoints:      s?.total_points      ?? 0,
          level:            s?.level             ?? 1,
        };
      });
    }
  }

  // ── Admin ─────────────────────────────────────────────────────────────────
  if (profile.role === "admin") {
    const [{ count: sc }, { count: cc }] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "coach"),
    ]);
    totalStudentsCount = sc ?? 0;
    totalCoachesCount  = cc ?? 0;
  }

  return (
    <AcademyDashboardClient
      profile={profile}
      userEmail={user.email ?? ""}
      gamification={gamification}
      coachName={coachName}
      coachAssigned={coachAssigned}
      lessonSummary={lessonSummary}
      playerRating={playerRating}
      playerFed={playerFed}
      coachStudentsCount={coachStudentsCount}
      coachStudentsSummary={coachStudentsSummary}
      totalStudentsCount={totalStudentsCount}
      totalCoachesCount={totalCoachesCount}
      activeClassroomSession={activeClassroomSession}
    />
  );
}
