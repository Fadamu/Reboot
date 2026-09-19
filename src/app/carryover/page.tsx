"use client";

import { useEffect, useState } from "react";

type Carryover = {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  units: number;
  grade: string;
  gradePoint: number;
  session: string;
  semester: string;
  status: string;
};

export default function CarryoverPage() {
  const [carryovers, setCarryovers] = useState<Carryover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCarryovers() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/carryover");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load carryovers.");
      }

      setCarryovers(data.carryovers ?? []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not load your carryovers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCarryovers();
  }, []);

  const totalUnits = carryovers.reduce(
    (sum, carryover) => sum + carryover.units,
    0
  );

  return (
    <main className="min-h-screen bg-[#08090c] px-6 py-10 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            REBOOT Recovery System
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
            Carryover Recovery
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            These are the courses your Results show you still need to clear.
            REBOOT will turn each one into a focused recovery journey.
          </p>
        </header>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center">
            <p className="text-zinc-400">
              Checking your academic results...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-400/20 bg-red-400/5 p-6 text-red-300">
            {error}
          </div>
        ) : carryovers.length === 0 ? (
          <section className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.04] p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl text-emerald-400">
              ✓
            </div>

            <h2 className="mt-6 text-2xl font-bold">
              No active carryovers
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-400">
              Your Results currently show no courses with an F grade.
              Keep going — the goal is to keep this screen empty.
            </p>
          </section>
        ) : (
          <>
            <section className="mb-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-red-400/20 bg-red-400/[0.04] p-6">
                <p className="text-sm text-zinc-500">
                  Active Carryovers
                </p>

                <p className="mt-2 text-4xl font-bold text-red-300">
                  {carryovers.length}
                </p>

                <p className="mt-2 text-xs text-zinc-600">
                  Courses waiting to be cleared
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <p className="text-sm text-zinc-500">
                  Carryover Units
                </p>

                <p className="mt-2 text-4xl font-bold">
                  {totalUnits}
                </p>

                <p className="mt-2 text-xs text-zinc-600">
                  Units to recover
                </p>
              </div>

              <div className="rounded-3xl border border-red-500/10 bg-red-500/[0.03] p-6">
                <p className="text-sm text-zinc-500">
                  Retake plan
                </p>

                <p className="mt-2 text-xl font-bold">
                  Build readiness, one course at a time.
                </p>

                <p className="mt-2 text-xs text-zinc-600">
                  One course at a time
                </p>
              </div>
            </section>

            <section>
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Your Recovery Queue
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Courses that need you
                </h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {carryovers.map((carryover) => (
                  <article
                    key={carryover.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-red-400/20 hover:bg-white/[0.045]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                          Carryover
                        </p>

                        <h3 className="mt-2 text-2xl font-bold">
                          {carryover.courseCode}
                        </h3>

                        <p className="mt-1 text-zinc-400">
                          {carryover.courseName}
                        </p>
                      </div>

                      <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-center">
                        <p className="text-xs text-zinc-500">
                          Previous
                        </p>

                        <p className="text-lg font-bold text-red-300">
                          {carryover.grade}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <p className="text-xs text-zinc-600">
                          Units
                        </p>

                        <p className="mt-1 font-semibold">
                          {carryover.units}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <p className="text-xs text-zinc-600">
                          Grade Point
                        </p>

                        <p className="mt-1 font-semibold">
                          {carryover.gradePoint.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                      <p className="text-xs text-zinc-600">
                        Original Result
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        {carryover.session} · {carryover.semester}
                      </p>
                    </div>

                    <div className="mt-6">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          Recovery progress
                        </span>

                        <span className="text-xs font-semibold text-red-500">
                          Starting
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full w-0 rounded-full bg-red-500" />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        (window.location.href = `/study?courseId=${encodeURIComponent(
                          carryover.courseId
                        )}`)
                      }
                      className="mt-6 w-full rounded-xl bg-red-500 px-5 py-3 font-semibold text-black transition hover:bg-red-400"
                    >
                      Start Recovery
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

