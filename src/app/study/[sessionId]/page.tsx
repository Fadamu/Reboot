"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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

type Note = {
  id: string;
  title: string;
  content: string;
  fileName: string | null;
  fileType: string | null;
  course: Course;
};

export default function StudySessionPage() {
  const params = useParams();
  const sessionId = String(params.sessionId);

  const [session, setSession] = useState<StudySession | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStudySession() {
      try {
        setIsLoading(true);
        setError("");

        const [sessionsResponse, notesResponse] = await Promise.all([
          fetch("/api/study-sessions"),
          fetch("/api/notes"),
        ]);

        if (!sessionsResponse.ok || !notesResponse.ok) {
          throw new Error("Failed to load study material.");
        }

        const sessionsData = await sessionsResponse.json();
        const notesData = await notesResponse.json();

        const foundSession = (sessionsData.sessions ?? []).find(
          (item: StudySession) => item.id === sessionId
        );

        if (!foundSession) {
          throw new Error("Study session not found.");
        }

        setSession(foundSession);

        const courseNotes = (notesData.notes ?? []).filter(
          (note: Note) => note.course.id === foundSession.course.id
        );

        setNotes(courseNotes);
      } catch (loadError) {
        console.error(loadError);

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load study session."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadStudySession();
  }, [sessionId]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#07090d] text-white">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:px-10">
          <p className="text-white/40">Loading your study session...</p>
        </div>
      </main>
    );
  }

  if (error || !session) {
    return (
      <main className="min-h-screen bg-[#07090d] text-white">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:px-10">
          <div className="rounded-3xl border border-red-400/20 bg-red-400/5 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-300">
              Study Engine
            </p>

            <h1 className="mt-3 text-3xl font-bold">
              Study session unavailable
            </h1>

            <p className="mt-3 text-white/50">
              {error || "This study session could not be found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            REBOOT / Study Engine
          </p>

          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                  {session.course.code}
                </span>

                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/40">
                  {session.course.units}{" "}
                  {session.course.units === 1 ? "unit" : "units"}
                </span>
              </div>

              <h1 className="mt-4 text-4xl font-bold tracking-tight">
                {session.topic}
              </h1>

              <p className="mt-2 text-lg text-white/45">
                {session.course.name}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                Mission time
              </p>

              <p className="mt-2 text-lg font-semibold">
                {session.startTime} — {session.endTime}
              </p>
            </div>
          </div>
        </div>

        {session.notes && (
          <section className="mb-8 rounded-3xl border border-cyan-400/15 bg-cyan-400/[0.04] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Mission objective
            </p>

            <p className="mt-3 text-white/65">{session.notes}</p>
          </section>
        )}

        <section>
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
              Your source material
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Study from your notes
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-white/40">
              REBOOT will use these course materials as the foundation for
              your study session and future quizzes.
            </p>
          </div>

          {notes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
              <h3 className="text-xl font-semibold">
                No notes uploaded for this course yet
              </h3>

              <p className="mx-auto mt-3 max-w-lg text-sm text-white/40">
                Upload your lecture notes from the Notes section before
                starting this mission. REBOOT needs your actual course
                material to build personalized study sessions and quizzes.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {notes.map((note) => (
                <article
                  key={note.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]"
                >
                  <div className="border-b border-white/10 px-6 py-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-xl font-semibold">
                          {note.title}
                        </h3>

                        {note.fileName && (
                          <p className="mt-1 text-sm text-white/35">
                            {note.fileName}
                          </p>
                        )}
                      </div>

                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/40">
                        Course material
                      </span>
                    </div>
                  </div>

                  <div className="max-h-[600px] overflow-y-auto px-6 py-6">
                    <div className="whitespace-pre-wrap text-[15px] leading-7 text-white/70">
                      {note.content}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
                Next phase
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Personalized quiz
              </h2>

              <p className="mt-2 text-sm text-white/40">
                Once the study flow is connected, REBOOT will generate
                questions from these notes and the topic you studied.
              </p>
            </div>

            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm font-semibold text-cyan-300">
              Study Engine
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}