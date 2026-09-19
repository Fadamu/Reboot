"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Course = {
  id: string;
  code: string;
  name: string;
  units: number;
};

type StudySession = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  topic: string;
  completed: boolean;
  notes: string | null;
  course: Course;
};

export default function PlannerPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [courseId, setCourseId] = useState("");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");

  async function loadPlanner() {
    try {
      setIsLoading(true);

      const [coursesResponse, sessionsResponse] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/study-sessions"),
      ]);

      if (!coursesResponse.ok || !sessionsResponse.ok) {
        throw new Error("Failed to load planner data");
      }

      const coursesData = await coursesResponse.json();
      const sessionsData = await sessionsResponse.json();

      setCourses(coursesData.courses ?? []);
      setSessions(sessionsData.sessions ?? []);
    } catch (error) {
      console.error(error);
      alert("Failed to load planner data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPlanner();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!courseId || !topic || !date || !startTime || !endTime) {
      alert("Please complete all required fields.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/study-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          topic,
          date,
          startTime,
          endTime,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to schedule session");
      }

      setTopic("");
      setStartTime("");
      setEndTime("");
      setNotes("");

      await loadPlanner();

      alert("Study session scheduled!");
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to schedule study session."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(session: StudySession) {
    const confirmed = window.confirm(
      `Delete the study session "${session.topic}" for ${session.course.code}?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(session.id);

    try {
      const response = await fetch("/api/study-sessions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: session.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete study session");
      }

      setSessions((current) =>
        current.filter((item) => item.id !== session.id)
      );
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete study session."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const groupedSessions = useMemo(() => {
    const groups: Record<string, StudySession[]> = {};

    for (const session of sessions) {
      const key = session.date.slice(0, 10);

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(session);
    }

    return Object.entries(groups).sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, [sessions]);

  function formatDate(dateString: string) {
    return new Date(`${dateString}T00:00:00`).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
      }
    );
  }

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-red-500">
            REBOOT / Study Engine
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Study Planner
          </h1>

          <p className="mt-3 max-w-2xl text-white/55">
            Turn your academic goals into focused study sessions. Schedule
            what you need to study, when you need to study it, and let REBOOT
            build from there.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                New Study Session
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Schedule study
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Course
                </label>

                <select
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0d1118] px-4 py-3 text-sm outline-none transition focus:border-red-500/50"
                  required
                >
                  <option value="">Select a course</option>

                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} — {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Topic
                </label>

                <input
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="e.g. TCP/IP fundamentals"
                  className="w-full rounded-xl border border-white/10 bg-[#0d1118] px-4 py-3 text-sm outline-none transition placeholder:text-white/25 focus:border-red-500/50"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Date
                </label>

                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0d1118] px-4 py-3 text-sm outline-none focus:border-red-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Start
                  </label>

                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0d1118] px-4 py-3 text-sm outline-none focus:border-red-500/50"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    End
                  </label>

                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0d1118] px-4 py-3 text-sm outline-none focus:border-red-500/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Notes <span className="text-white/30">(optional)</span>
                </label>

                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="What do you want to accomplish?"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#0d1118] px-4 py-3 text-sm outline-none transition placeholder:text-white/25 focus:border-red-500/50"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-xl bg-red-500 px-4 py-3 font-semibold text-black transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Scheduling..." : "Schedule Study Session"}
              </button>
            </form>
          </section>

          <section>
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                  Your timetable
                </p>

                <h2 className="mt-2 text-2xl font-semibold">
                  Upcoming study sessions
                </h2>
              </div>

              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/55">
                {sessions.length}{" "}
                {sessions.length === 1 ? "session" : "sessions"}
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center text-white/40">
                Loading your timetable...
              </div>
            ) : groupedSessions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                <div className="text-4xl">◦</div>

                <h3 className="mt-4 text-lg font-semibold">
                  Your timetable is empty
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm text-white/40">
                  Schedule your first study session and REBOOT will start
                  building your study engine.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedSessions.map(([dateKey, daySessions]) => (
                  <div key={dateKey}>
                    <div className="mb-3 flex items-center gap-3">
                      <h3 className="font-semibold">
                        {formatDate(dateKey)}
                      </h3>

                      <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <div className="space-y-3">
                      {daySessions.map((session) => (
                        <div
                          key={session.id}
                          className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-white/20"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex gap-4">
                              <div className="min-w-[95px] rounded-xl bg-red-500/10 px-3 py-3 text-center">
                                <p className="text-sm font-semibold text-red-400">
                                  {session.startTime}
                                </p>

                                <p className="mt-1 text-xs text-white/35">
                                  {session.endTime}
                                </p>
                              </div>

                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/70">
                                    {session.course.code}
                                  </span>

                                  {session.completed && (
                                    <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                                      Completed
                                    </span>
                                  )}
                                </div>

                                <h4 className="mt-2 text-lg font-semibold">
                                  {session.topic}
                                </h4>

                                <p className="mt-1 text-sm text-white/40">
                                  {session.course.name}
                                </p>

                                {session.notes && (
                                  <p className="mt-3 text-sm text-white/50">
                                    {session.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-sm text-white/35">
                                {session.course.units}{" "}
                                {session.course.units === 1
                                  ? "unit"
                                  : "units"}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDelete(session)}
                                disabled={deletingId === session.id}
                                className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deletingId === session.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

