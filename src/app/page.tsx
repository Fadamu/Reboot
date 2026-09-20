"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Result = { units: number; gradePoint: number; semester: string };
type Carryover = { id: string; courseId: string; courseCode: string; courseName: string; units: number; grade: string };
type StudySession = { id: string; topic: string; date: string; startTime: string; endTime: string; course: { code: string } };
type AcademicState = { cgpa: number; semesterGpa: number; totalUnits: number; carryovers: number; loading: boolean };

export default function Home() {
  const router = useRouter();
  const [academic, setAcademic] = useState<AcademicState>({ cgpa: 0, semesterGpa: 0, totalUnits: 0, carryovers: 0, loading: true });
  const [carryovers, setCarryovers] = useState<Carryover[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [studentName, setStudentName] = useState("Student");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [resultsResponse, carryoverResponse, sessionsResponse, studentResponse] = await Promise.all([fetch("/api/results"), fetch("/api/carryover"), fetch("/api/study-sessions"), fetch("/api/student")]);
        const resultsData = await resultsResponse.json();
        if (!resultsResponse.ok) throw new Error(resultsData.error ?? "We could not load your academic record.");
        const results: Result[] = resultsData.results ?? [];
        const totalUnits = results.reduce((sum, result) => sum + result.units, 0);
        const totalQualityPoints = results.reduce((sum, result) => sum + result.units * result.gradePoint, 0);
        const currentSemester = results[0]?.semester;
        const current = currentSemester ? results.filter((result) => result.semester === currentSemester) : [];
        const semesterUnits = current.reduce((sum, result) => sum + result.units, 0);
        const semesterPoints = current.reduce((sum, result) => sum + result.units * result.gradePoint, 0);
        const carryoverData = carryoverResponse.ok ? await carryoverResponse.json() : { carryovers: [], summary: { total: 0 } };
        const sessionsData = sessionsResponse.ok ? await sessionsResponse.json() : { sessions: [] };
        const studentData = studentResponse.ok ? await studentResponse.json() : null;
        setAcademic({ cgpa: totalUnits ? totalQualityPoints / totalUnits : 0, semesterGpa: semesterUnits ? semesterPoints / semesterUnits : 0, totalUnits, carryovers: carryoverData.summary?.total ?? 0, loading: false });
        setCarryovers(carryoverData.carryovers ?? []); setSessions(sessionsData.sessions ?? []);
        if (studentData?.name) setStudentName(studentData.name);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "We could not load your academic record.");
        setAcademic((current) => ({ ...current, loading: false }));
      }
    }
    loadDashboard();
  }, []);

  const today = useMemo(() => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date()), []);
  const firstName = studentName.split(" ")[0] || "Student";
  const priority = carryovers[0];
  const upcoming = sessions.filter((session) => new Date(session.date).getTime() >= new Date().setHours(0, 0, 0, 0)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const recommendation = priority
    ? { label: "Recovery needs attention", title: `Build readiness for ${priority.courseCode}`, description: `${priority.courseName} is an active carryover. Use your materials, focused topics, and recovery quiz evidence to prepare for a retake.`, action: "Open recovery plan", href: `/carryover/${priority.courseId}`, tone: "risk" }
    : upcoming
      ? { label: "Next academic action", title: `Study ${upcoming.course.code}: ${upcoming.topic}`, description: `This planned session is the clearest way to add useful study evidence to your record today.`, action: "Open study", href: "/study", tone: "recovery" }
      : academic.totalUnits === 0
        ? { label: "Build your record", title: "Start with your academic structure", description: "Add your first semester and courses so REBOOT can connect results, materials, study plans, and recovery work.", action: "Add courses", href: "/courses", tone: "neutral" }
        : { label: "Next academic action", title: "Plan your next focused study session", description: "A planned session gives your academic record a concrete next step and creates room for meaningful study evidence.", action: "Open planner", href: "/planner", tone: "neutral" };

  return <main className="min-h-[calc(100vh-4rem)] bg-[#090b0e] px-5 py-7 text-white sm:px-8 lg:px-10 lg:py-10"><div className="mx-auto max-w-7xl">
    <section className="max-w-3xl"><p className="text-sm text-zinc-500">{today}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-zinc-50 sm:text-4xl">Good to see you, {firstName}.</h1><p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">Your academic record is strongest when the next decision is clear. REBOOT keeps your courses, study evidence, and recovery work connected.</p></section>
    {error ? <section role="alert" className="mt-8 flex flex-col gap-3 rounded-xl border border-red-400/25 bg-red-400/[0.08] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-red-100">Your overview needs attention</p><p className="mt-1 text-sm text-red-200/75">{error}</p></div><button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-lg bg-red-200 px-4 text-sm font-semibold text-[#351112]">Try again</button></section> : null}
    <section className={`mt-9 grid overflow-hidden rounded-2xl border p-6 sm:p-8 lg:grid-cols-[1.35fr_.65fr] lg:gap-12 ${recommendation.tone === "risk" ? "border-red-400/25 bg-[#1a1011]" : recommendation.tone === "recovery" ? "border-amber-300/25 bg-[#19160f]" : "border-white/10 bg-[#11161a]"}`}><div><p className={`text-sm font-medium ${recommendation.tone === "risk" ? "text-red-200" : recommendation.tone === "recovery" ? "text-amber-200" : "text-zinc-400"}`}>{recommendation.label}</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">{recommendation.title}</h2><p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">{recommendation.description}</p><button type="button" onClick={() => router.push(recommendation.href)} className="mt-7 min-h-12 rounded-lg bg-white px-5 text-sm font-semibold text-[#111418] transition hover:bg-zinc-200">{recommendation.action}</button></div><div className="mt-8 border-t border-white/10 pt-6 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><p className="text-sm font-medium text-zinc-400">Why this is first</p><dl className="mt-5 space-y-5 text-sm"><Evidence label="Academic status" value={academic.loading ? "Loading record" : academic.carryovers ? `${academic.carryovers} active ${academic.carryovers === 1 ? "carryover" : "carryovers"}` : "No active carryovers"} /><Evidence label="Evidence on hand" value={academic.loading ? "Checking your record" : `${academic.totalUnits} recorded ${academic.totalUnits === 1 ? "unit" : "units"} on the 4.0 scale`} /><Evidence label="What happens next" value="Study work and quizzes build evidence for academic decisions." /></dl></div></section>
    <section className="mt-10"><div className="flex items-end justify-between gap-5"><div><h2 className="text-xl font-semibold text-white">Academic record</h2><p className="mt-1 text-sm text-zinc-500">A concise read on the evidence currently recorded.</p></div><button type="button" onClick={() => router.push("/results")} className="min-h-11 text-sm font-medium text-zinc-400 hover:text-white">View results</button></div><dl className="mt-5 grid divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-[#0c0f13] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4"><Metric label="CGPA" value={academic.loading ? "â€”" : academic.cgpa.toFixed(2)} detail="4.00 scale" /><Metric label="Latest semester GPA" value={academic.loading ? "â€”" : academic.semesterGpa.toFixed(2)} detail="Recorded results" /><Metric label="Completed units" value={academic.loading ? "â€”" : String(academic.totalUnits)} detail="Across all results" /><Metric label="Recovery queue" value={academic.loading ? "â€”" : String(academic.carryovers)} detail={academic.carryovers ? "Requires attention" : "No courses flagged"} risk={academic.carryovers > 0} /></dl></section>
    <section className="mt-10 grid gap-8 xl:grid-cols-[1.25fr_.75fr]"><div><h2 className="text-xl font-semibold text-white">Upcoming study</h2><p className="mt-1 text-sm text-zinc-500">Sessions planned in your personal academic calendar.</p><div className="mt-5 divide-y divide-white/10 rounded-xl border border-white/10 bg-[#0c0f13]">{sessions.slice(0, 3).map((session) => <button key={session.id} type="button" onClick={() => router.push("/study")} className="flex min-h-20 w-full items-center gap-4 px-5 text-left transition hover:bg-white/[0.04]"><div className="w-20 shrink-0 text-sm text-zinc-500">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(session.date))}</div><div className="min-w-0 flex-1"><p className="font-medium text-zinc-100">{session.topic}</p><p className="mt-1 text-sm text-zinc-500">{session.course.code} Â· {session.startTime}â€“{session.endTime}</p></div><span className="text-sm text-zinc-500">Study</span></button>)}{!academic.loading && sessions.length === 0 ? <div className="p-6"><p className="font-medium text-zinc-100">No study sessions planned.</p><p className="mt-1 text-sm text-zinc-500">Plan the next focused block for a course that matters now.</p><button type="button" onClick={() => router.push("/planner")} className="mt-4 min-h-11 rounded-lg border border-white/15 px-4 text-sm font-medium text-zinc-200 hover:bg-white/[0.05]">Open planner</button></div> : null}</div></div><div><h2 className="text-xl font-semibold text-white">Recovery queue</h2><p className="mt-1 text-sm text-zinc-500">Failed courses stay visible until their retake result is recorded.</p><div className="mt-5 space-y-3">{carryovers.slice(0, 2).map((course) => <button key={course.id} type="button" onClick={() => router.push(`/carryover/${course.courseId}`)} className="w-full rounded-xl border border-red-400/20 bg-red-400/[0.06] p-5 text-left transition hover:bg-red-400/[0.1]"><p className="text-sm font-semibold text-red-100">{course.courseCode}</p><p className="mt-1 text-sm text-zinc-300">{course.courseName}</p><p className="mt-3 text-xs text-red-200/70">Previous grade: {course.grade} Â· {course.units} units</p></button>)}{!academic.loading && carryovers.length === 0 ? <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-5"><p className="font-medium text-emerald-100">No active recovery work.</p><p className="mt-1 text-sm text-emerald-100/65">Keep your record current and protect that progress.</p></div> : null}</div></div></section>
  </div></main>;
}

function Evidence({ label, value }: { label: string; value: string }) { return <div><dt className="text-zinc-500">{label}</dt><dd className="mt-1 font-medium text-zinc-100">{value}</dd></div>; }
function Metric({ label, value, detail, risk = false }: { label: string; value: string; detail: string; risk?: boolean }) { return <div className="p-5"><dt className="text-sm text-zinc-500">{label}</dt><dd className={`mt-3 text-3xl font-semibold tracking-[-0.03em] ${risk ? "text-red-200" : "text-zinc-50"}`}>{value}</dd><p className={`mt-2 text-xs ${risk ? "text-red-200/70" : "text-zinc-500"}`}>{detail}</p></div>; }

