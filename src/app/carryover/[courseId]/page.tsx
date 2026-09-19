"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type RecoveryData = {
  course: {
    id: string;
    code: string;
    name: string;
    units: number;
  };
  originalResult: {
    id: string;
    grade: string;
    gradePoint: number;
    session: string;
    semester: string;
  };
  recovery: {
    progress: number;
    completedSessions: number;
    totalSessions: number;
    notesCount: number;
    topicsCount: number;
  };
  notes: {
    id: string;
    title: string;
    createdAt: string;
  }[];
  topics: {
    id: string;
    name: string;
  }[];
  studySessions: {
    id: string;
    topic: string;
    completed: boolean;
    date: string;
  }[];
};

type TopicPerformance = {
  topic: string;
  questions: number;
  answered: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  status:
    | "NOT_STARTED"
    | "NEEDS_WORK"
    | "IMPROVING"
    | "STRONG";
};

type PerformanceData = {
  course: {
    id: string;
    code: string;
    name: string;
    units: number;
  };
  overall: {
    questions: number;
    answered: number;
    correct: number;
    incorrect: number;
    accuracy: number;
  };
  weakTopics: TopicPerformance[];
  topics: TopicPerformance[];
};

type RecoveryStatus =
  | "NOT_STARTED"
  | "STARTING"
  | "IMPROVING"
  | "READY";

export default function RecoveryMissionPage() {
  const params = useParams();
  const router = useRouter();

  const courseId = params.courseId as string;

  const [data, setData] = useState<RecoveryData | null>(null);
  const [performance, setPerformance] =
    useState<PerformanceData | null>(null);

  const [loading, setLoading] = useState(true);
  const [performanceLoading, setPerformanceLoading] =
    useState(true);

  const [error, setError] = useState("");
  const [performanceError, setPerformanceError] = useState("");

  useEffect(() => {
    async function loadRecovery() {
      try {
        const response = await fetch(
          `/api/carryover/${encodeURIComponent(courseId)}`
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Failed to load recovery mission."
          );
        }

        setData(result);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load recovery mission."
        );
      } finally {
        setLoading(false);
      }
    }

    async function loadPerformance() {
      try {
        const response = await fetch(
          `/api/carryover/${encodeURIComponent(
            courseId
          )}/performance`
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Failed to load recovery performance."
          );
        }

        setPerformance(result);
      } catch (err) {
        console.error(err);

        setPerformanceError(
          err instanceof Error
            ? err.message
            : "Failed to load recovery performance."
        );
      } finally {
        setPerformanceLoading(false);
      }
    }

    if (courseId) {
      loadRecovery();
      loadPerformance();
    }
  }, [courseId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#08090c] px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center">
            <p className="text-zinc-400">
              Loading your recovery mission...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#08090c] px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <button
            onClick={() => router.push("/carryover")}
            className="mb-6 text-sm text-zinc-500 transition hover:text-white"
          >
            Back to Carryovers
          </button>

          <div className="rounded-3xl border border-red-400/20 bg-red-400/[0.04] p-8 text-red-300">
            {error || "Recovery mission could not be loaded."}
          </div>
        </div>
      </main>
    );
  }

  const { course, originalResult, recovery, notes, topics } =
    data;

  const progress = recovery.progress;

  const overallAccuracy =
    performance?.overall.accuracy ?? 0;

  const hasQuizData =
    performance !== null &&
    performance.overall.answered > 0;

  const hasWeakTopics =
    performance !== null &&
    performance.weakTopics.length > 0;

  const hasStrongTopics =
    performance !== null &&
    performance.topics.some(
      (topic) => topic.status === "STRONG"
    );

  const recoveryStatus: RecoveryStatus =
    !hasQuizData && recovery.completedSessions === 0
      ? "NOT_STARTED"
      : !hasQuizData
        ? "STARTING"
        : overallAccuracy >= 80 && !hasWeakTopics
          ? "READY"
          : "IMPROVING";

  const recoveryStatusLabel = {
    NOT_STARTED: "Not Started",
    STARTING: "Starting",
    IMPROVING: "Improving",
    READY: "Ready",
  }[recoveryStatus];

  const recoveryStatusDescription = {
    NOT_STARTED:
      "You have not started your recovery journey yet.",
    STARTING:
      "You have started studying. Complete a recovery quiz so REBOOT can understand your performance.",
    IMPROVING:
      "You are making progress. Keep working through the focus areas where your performance is still weak.",
    READY:
      "Your current quiz performance is strong and REBOOT is no longer seeing major weak areas.",
  }[recoveryStatus];

  const nextAction =
    recoveryStatus === "NOT_STARTED"
      ? "Begin Recovery"
      : hasWeakTopics
        ? "Study Weak Areas"
        : recoveryStatus === "READY"
          ? "Keep Practicing"
          : "Continue Recovery";

  return (
    <main className="min-h-screen bg-[#08090c] px-6 py-10 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => router.push("/carryover")}
          className="mb-8 text-sm text-zinc-500 transition hover:text-white"
        >
          Back to Carryovers
        </button>

        <section className="relative overflow-hidden rounded-[2rem] border border-red-400/20 bg-gradient-to-br from-red-400/[0.08] via-white/[0.03] to-red-500/[0.04] p-7 md:p-10">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-red-400/10 blur-3xl" />

          <div className="relative">
            <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-400">
                  Recovery plan
                </p>

                <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
                  {course.code}
                </h1>

                <p className="mt-2 text-xl text-zinc-300">
                  {course.name}
                </p>

                <p className="mt-4 text-sm text-zinc-500">
                  {course.units} course{" "}
                  {course.units === 1 ? "unit" : "units"} · Previous
                  attempt: {originalResult.session} ·{" "}
                  {originalResult.semester}
                </p>
              </div>

              <div className="w-fit rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-6 py-5 text-center">
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Previous Grade
                </p>

                <p className="mt-1 text-5xl font-black text-red-300">
                  {originalResult.grade}
                </p>
              </div>
            </div>

            <div className="mt-10">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    Recovery Progress
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Based on completed recovery study sessions
                  </p>
                </div>

                <span className="text-2xl font-black text-red-400">
                  {progress}%
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-black/30">
                <div
                  className="h-full rounded-full bg-red-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-7">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                Recovery Status
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {recoveryStatusLabel}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                {recoveryStatusDescription}
              </p>
            </div>

            <div
              className={`rounded-2xl border px-6 py-4 text-center ${
                recoveryStatus === "READY"
                  ? "border-emerald-400/20 bg-emerald-400/[0.05]"
                  : recoveryStatus === "IMPROVING"
                    ? "border-amber-400/20 bg-amber-400/[0.05]"
                    : "border-red-500/20 bg-red-500/[0.05]"
              }`}
            >
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Next Move
              </p>

              <p className="mt-1 font-bold text-white">
                {nextAction}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
              Your recovery path
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Clear {course.code}.
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
              This is not ordinary studying. You are coming back for a
              course you previously could not clear. REBOOT will use your
              actual course material, study activity, and quiz performance
              to help you prepare for the next attempt.
            </p>

            <div className="mt-8 space-y-4">
              <MissionStep
                number="01"
                title="Understand"
                description="Identify the topics and material you need to master."
                done={topics.length > 0}
              />

              <MissionStep
                number="02"
                title="Study"
                description="Work through your uploaded course material."
                done={recovery.totalSessions > 0}
              />

              <MissionStep
                number="03"
                title="Practice"
                description="Use focused questions to test what you have learned."
                done={(performance?.overall.questions ?? 0) > 0}
              />

              <MissionStep
                number="04"
                title="Demonstrate readiness"
                description={
                  hasWeakTopics
                    ? "Keep working on the topics where your quiz accuracy is still low."
                    : hasQuizData && hasStrongTopics
                      ? "Your quiz performance is showing strong understanding across your studied topics."
                      : "Complete recovery quizzes so REBOOT can identify your weak areas."
                }
                done={
                  hasQuizData &&
                  !hasWeakTopics &&
                  performance!.overall.accuracy >= 80
                }
              />

              <MissionStep
                number="05"
                title="Clear it"
                description="Retake the course and replace the previous F with a pass."
                done={false}
              />
            </div>
          </div>

          <div className="space-y-4">
            <StatCard
              label="Study Material"
              value={String(recovery.notesCount)}
              description={
                recovery.notesCount === 1
                  ? "uploaded note"
                  : "uploaded notes"
              }
            />

            <StatCard
              label="Topics"
              value={String(recovery.topicsCount)}
              description={
                recovery.topicsCount === 1
                  ? "topic available"
                  : "topics available"
              }
            />

            <StatCard
              label="Study Sessions"
              value={`${recovery.completedSessions}/${recovery.totalSessions}`}
              description="completed sessions"
            />
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-red-500/20 bg-red-500/[0.04] p-7">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
                Recovery Intelligence
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                How are you actually doing?
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                REBOOT uses your recovery quiz answers to identify the
                topics that need more attention.
              </p>
            </div>

            {hasQuizData && (
              <div className="rounded-2xl border border-red-500/20 bg-black/20 px-6 py-4 text-center">
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Overall Accuracy
                </p>

                <p
                  className={`mt-1 text-4xl font-black ${
                    overallAccuracy >= 80
                      ? "text-emerald-300"
                      : overallAccuracy >= 50
                        ? "text-amber-300"
                        : "text-red-300"
                  }`}
                >
                  {overallAccuracy}%
                </p>
              </div>
            )}
          </div>

          {performanceLoading ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-6">
              <p className="text-sm text-zinc-500">
                Analyzing your recovery performance...
              </p>
            </div>
          ) : performanceError ? (
            <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-5 text-sm text-red-300">
              {performanceError}
            </div>
          ) : !hasQuizData ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-black/10 p-6">
              <p className="font-semibold">
                No recovery quiz data yet.
              </p>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Complete a study session and its recovery quiz. REBOOT
                will then start identifying your strong and weak topics.
              </p>
            </div>
          ) : (
            <>
              {hasWeakTopics && (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-400/10 text-red-300">
                      !
                    </div>

                    <div>
                      <p className="font-bold text-red-200">
                        Focus Areas
                      </p>

                      <p className="text-sm text-red-300/70">
                        These topics need more work before you move on.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {performance.weakTopics.map((topic) => (
                      <TopicPerformanceCard
                        key={topic.topic}
                        topic={topic}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <p className="text-sm font-semibold">
                  Topic Performance
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {performance.topics.map((topic) => (
                    <TopicPerformanceCard
                      key={topic.topic}
                      topic={topic}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-7">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                Recovery Material
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                What you are working with
              </h2>
            </div>

            <span className="text-sm text-zinc-500">
              {recovery.notesCount} materials · {recovery.topicsCount} topics
            </span>
          </div>

          {notes.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-6">
              <p className="font-semibold">
                No material uploaded yet.
              </p>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Upload your notes for this course before beginning serious
                recovery study. Your future quizzes should be generated from
                these materials.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-2xl border border-white/10 bg-black/10 p-5"
                >
                  <p className="font-semibold">{note.title}</p>

                  <p className="mt-2 text-xs text-zinc-600">
                    Course material
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            Recovery Topics
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            What you need to master
          </h2>

          {topics.length === 0 ? (
            <p className="mt-5 text-sm text-zinc-500">
              Topics will appear here once REBOOT extracts them from your
              course material.
            </p>
          ) : (
            <div className="mt-6 flex flex-wrap gap-3">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className="rounded-xl border border-red-500/10 bg-red-500/[0.04] px-4 py-3 text-sm text-zinc-300"
                >
                  {topic.name}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-red-500/20 bg-red-500/[0.04] p-7 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
            Ready?
          </p>

          <h2 className="mt-3 text-3xl font-black">
            {hasWeakTopics
              ? "Focus on the areas that need more work."
              : recoveryStatus === "READY"
                ? "You are getting ready."
                : recoveryStatus === "STARTING"
                  ? "Keep building momentum."
                  : "Start your recovery."}
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-500">
            {hasWeakTopics
              ? "REBOOT has identified topics that need more attention. Your next recovery session should focus on understanding them."
              : recoveryStatus === "READY"
                ? "Your performance is strong. Keep practicing so the knowledge stays solid before your retake."
                : recoveryStatus === "STARTING"
                  ? "You have started the journey. Keep studying and complete a quiz so REBOOT can begin measuring your recovery."
                  : "REBOOT will take you into the study flow for this exact course. Your study activity will become part of this recovery mission."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/study?courseId=${encodeURIComponent(
                  course.id
                )}&mode=carryover`
              )
            }
            className="mt-7 rounded-xl bg-red-500 px-8 py-3.5 font-bold text-black transition hover:bg-red-400"
          >
            {nextAction}
          </button>
        </section>
      </div>
    </main>
  );
}

function MissionStep({
  number,
  title,
  description,
  done,
}: {
  number: string;
  title: string;
  description: string;
  done: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
          done
            ? "bg-emerald-400/10 text-emerald-300"
            : "bg-white/5 text-zinc-500"
        }`}
      >
        {done ? "✓" : number}
      </div>

      <div className="pt-1">
        <p className="font-semibold">{title}</p>

        <p className="mt-1 text-sm leading-6 text-zinc-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">{value}</p>

      <p className="mt-1 text-sm text-zinc-500">
        {description}
      </p>
    </div>
  );
}

function TopicPerformanceCard({
  topic,
}: {
  topic: TopicPerformance;
}) {
  const statusConfig = {
    NOT_STARTED: {
      label: "Not Started",
      text: "text-zinc-400",
      border: "border-white/10",
      bg: "bg-white/[0.03]",
    },
    NEEDS_WORK: {
      label: "Needs Work",
      text: "text-red-300",
      border: "border-red-400/20",
      bg: "bg-red-400/[0.04]",
    },
    IMPROVING: {
      label: "Improving",
      text: "text-amber-300",
      border: "border-amber-400/20",
      bg: "bg-amber-400/[0.04]",
    },
    STRONG: {
      label: "Strong",
      text: "text-emerald-300",
      border: "border-emerald-400/20",
      bg: "bg-emerald-400/[0.04]",
    },
  };

  const config = statusConfig[topic.status];

  return (
    <div
      className={`rounded-2xl border ${config.border} ${config.bg} p-5`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">{topic.topic}</p>

          <p className={`mt-1 text-xs font-semibold ${config.text}`}>
            {config.label}
          </p>
        </div>

        <p className={`text-2xl font-black ${config.text}`}>
          {topic.accuracy}%
        </p>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
        <div
          className={`h-full rounded-full ${
            topic.status === "STRONG"
              ? "bg-emerald-400"
              : topic.status === "IMPROVING"
                ? "bg-amber-400"
                : topic.status === "NEEDS_WORK"
                  ? "bg-red-400"
                  : "bg-zinc-600"
          }`}
          style={{ width: `${topic.accuracy}%` }}
        />
      </div>

      <div className="mt-3 flex justify-between text-xs text-zinc-600">
        <span>{topic.answered} answered</span>
        <span>
          {topic.correct}/{topic.answered} correct
        </span>
      </div>
    </div>
  );
}

