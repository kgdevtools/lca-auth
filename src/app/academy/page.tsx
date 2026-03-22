import { getCurrentUserWithProfile } from "@/utils/auth/academyAuth";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AcademyDashboardClient from "@/components/academy/AcademyDashboardClient";

export default async function AcademyDashboard() {
  const { user, profile } = await getCurrentUserWithProfile();

  if (!profile) {
    redirect("/login");
  }

  // Fetch academy progress stats for students
  let inProgressLessons = 0;
  let completedLessons = 0;
  let averageQuizScore = 0;
  let totalTimeMinutes = 0;
  let studentsCount = 0;

  if (profile.role === "student") {
    const supabase = await createClient();
    
    const { data: progress } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("student_id", profile.id);

    if (progress) {
      inProgressLessons = progress.filter(p => p.status === "in_progress").length;
      completedLessons = progress.filter(p => p.status === "completed").length;
      totalTimeMinutes = Math.round(
        progress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0) / 60
      );
      const scored = progress.filter(p => p.quiz_score !== null);
      if (scored.length > 0) {
        averageQuizScore = Math.round(
          scored.reduce((sum, p) => sum + (p.quiz_score || 0), 0) / scored.length
        );
      }
    }
  }

  // For coaches, get their students count
  if (profile.role === "coach") {
    const supabase = await createClient();
    const { count } = await supabase
      .from("student_coach_assignments")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", profile.id);
    studentsCount = count || 0;
  }

  // For admins, get total students count
  if (profile.role === "admin") {
    const supabase = await createClient();
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student");
    studentsCount = count || 0;
  }

  return (
    <AcademyDashboardClient
      user={user}
      profile={profile}
      inProgressLessons={inProgressLessons}
      completedLessons={completedLessons}
      averageQuizScore={averageQuizScore}
      totalTimeMinutes={totalTimeMinutes}
      studentsCount={studentsCount}
    />
  );
}