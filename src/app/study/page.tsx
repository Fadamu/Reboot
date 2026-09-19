"use client";

import { useEffect, useState } from "react";

type Course = {
  id: string;
  code: string;
  name: string;
  units: number;
  notes?: Note[];
};

type Note = {
  id: string;
  title: string;
  fileName: string | null;
  fileType: string | null;
};

type Topic = {
  id: string;
  name: string;
  sourceNoteId: string;
  sourceNoteTitle: string;
};

type RecoveryData = {
  course: {
    id: string;
    code: string;
    name: string;
    units: number;
  };
  originalResult: {
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
};

export default function StudyPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [deletingTopic, setDeletingTopic] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [carryoverMode, setCarryoverMode] = useState(false);
  const [recoveryData, setRecoveryData] = useState<RecoveryData | null>(null);
  const [loadingRecovery, setLoadingRecovery] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const courseId = params.get("courseId");

    if (mode === "carryover" && courseId) {
      setCarryoverMode(true);
      setSelectedCourse(courseId);
      setLoadingRecovery(true);

      fetch(`/api/carryover/${encodeURIComponent(courseId)}`)
        .then(async (response) => {
          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error || "Could not load the carryover recovery."
            );
          }

          setRecoveryData(data);
        })
        .catch((err) => {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "Could not load the carryover recovery."
          );
        })
        .finally(() => {
          setLoadingRecovery(false);
        });
    }
  }, []);

  useEffect(() => {
    async function loadCourses() {
      try {
        const response = await fetch("/api/courses");

        if (!response.ok) {
          throw new Error("Failed to load courses.");
        }

        const data = await response.json();
        const loadedCourses: Course[] = data.courses ?? [];

        setCourses(loadedCourses);

        if (!carryoverMode && loadedCourses.length > 0) {
          setSelectedCourse(loadedCourses[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("Could not load your courses.");
      } finally {
        setLoadingCourses(false);
      }
    }

    loadCourses();
  }, [carryoverMode]);

  useEffect(() => {
    if (!selectedCourse) {
      setTopics([]);
      setSelectedTopic(null);
      return;
    }

    async function loadTopics() {
      setLoadingTopics(true);
      setSelectedTopic(null);
      setError("");

      try {
        const response = await fetch(
          `/api/study/topics?courseId=${encodeURIComponent(selectedCourse)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load study topics.");
        }

        setTopics(data.topics ?? []);
      } catch (err) {
        console.error(err);
        setTopics([]);
        setError(
          err instanceof Error
            ? err.message
            : "Could not load study topics."
        );
      } finally {
        setLoadingTopics(false);
      }
    }

    loadTopics();
  }, [selectedCourse]);

  const selectedCourseData = courses.find(
    (course) => course.id === selectedCourse
  );

  const selectedTopicData = topics.find(
    (topic) => topic.id === selectedTopic
  );

  async function deleteTopic(topic: Topic) {
    const confirmed = window.confirm(
      `Delete "${topic.name}" from your study topics?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingTopic(topic.id);
    setError("");

    try {
      const response = await fetch("/api/study/topics", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: selectedCourse,
          topicName: topic.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete topic.");
      }

      setTopics((currentTopics) =>
        currentTopics.filter((currentTopic) => currentTopic.id !== topic.id)
      );

      if (selectedTopic === topic.id) {
        setSelectedTopic(null);
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to delete topic."
      );
    } finally {
      setDeletingTopic(null);
    }
  }

  async function startSession() {
    if (!selectedCourse || !selectedTopicData) {
      return;
    }

    setError("");

    try {
      const now = new Date();
      const time = now.toTimeString().slice(0, 5);

      const response = await fetch("/api/study", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: selectedCourse,
          topic: selectedTopicData.name,
          date: now.toISOString(),
          startTime: time,
          endTime: time,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start study session.");
      }

      const mode = carryoverMode ? "carryover" : "normal";

      window.location.href =
        `/study/${data.session.id}` +
        `?mode=${mode}` +
        `&courseId=${encodeURIComponent(selectedCourse)}`;
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start study session."
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0a0b] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">

        {carryoverMode && (
          <section className="mb-8 overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 via-white/5 to-red-400/5 p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
                  Carryover Recovery
                </p>

                <h1 className="mt-2 text-3xl font-bold">
                  We are clearing this course.
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  This is not ordinary study. REBOOT is helping you recover
                  from the previous result and build back toward a pass.
                </p>
              </div>

              {recoveryData && (
                <div className="shrink-0 rounded-2xl border border-white/10 bg-black/20 px-6 py-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">
                    Recovery progress
                  </p>

                  <p className="mt-1 text-3xl font-bold text-amber-400">
                    {recoveryData.recovery.progress}%
                  </p>
                </div>
              )}
            </div>

            {recoveryData && (
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs text-zinc-500">Previous result</p>
                  <p className="mt-1 font-semibold text-red-300">
                    {recoveryData.originalResult.grade}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs text-zinc-500">Study sessions</p>
                  <p className="mt-1 font-semibold">
                    {recoveryData.recovery.completedSessions}/
                    {recoveryData.recovery.totalSessions}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs text-zinc-500">Topics to recover</p>
                  <p className="mt-1 font-semibold">
                    {recoveryData.recovery.topicsCount}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-500">
            REBOOT Study Engine
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            {carryoverMode
              ? "Choose what you need to recover."
              : "What do you want to study?"}
          </h1>

          <p className="mt-3 max-w-2xl text-zinc-400">
            {carryoverMode
              ? "Focus on the topics from your uploaded material. Every session is part of your recovery journey."
              : "Choose one of your courses. REBOOT will show study topics found inside your own uploaded materials."}
          </p>
        </div>

        <div className="mb-10">
          <label className="mb-3 block text-sm font-semibold text-zinc-300">
            {carryoverMode ? "Recovery course" : "Choose a course"}
          </label>

          {loadingCourses || loadingRecovery ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-zinc-400">
              Loading your study environment...
            </div>
          ) : carryoverMode && recoveryData ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
              <p className="text-sm font-semibold text-amber-400">
                {recoveryData.course.code}
              </p>

              <h2 className="mt-1 text-xl font-bold">
                {recoveryData.course.name}
              </h2>

              <p className="mt-2 text-sm text-zinc-400">
                {recoveryData.course.units} course units
              </p>
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-amber-300">
              <p className="font-semibold">No courses yet</p>
              <p className="mt-1 text-sm text-amber-200/70">
                Add your courses first.
              </p>
            </div>
          ) : (
            <select
              value={selectedCourse}
              onChange={(event) => setSelectedCourse(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#0d0a0b] px-4 py-4 text-white outline-none transition focus:border-red-500"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedCourseData && (
          <section>
            <div className="mb-6">
              <p className="text-sm font-medium text-red-500">
                {selectedCourseData.code}
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                {selectedCourseData.name}
              </h2>

              <p className="mt-2 text-sm text-zinc-400">
                {carryoverMode
                  ? "Recovery topics from your uploaded materials"
                  : "Topics from your uploaded materials"}
              </p>
            </div>

            {loadingTopics ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-zinc-400">
                Reading your study materials...
              </div>
            ) : topics.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl text-red-500">
                  +
                </div>

                <h3 className="mt-5 text-xl font-semibold">
                  No topics found yet
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-400">
                  REBOOT could not find topic headings in this course&apos;s
                  uploaded materials. Upload notes with clear headings,
                  chapters, units, or sections and REBOOT will use them here.
                </p>

                <a
                  href={`/notes?courseId=${selectedCourseData.id}`}
                  className="mt-5 inline-flex rounded-xl bg-red-500 px-5 py-3 font-semibold text-black transition hover:bg-red-500"
                >
                  Manage Course Notes
                </a>
              </div>
            ) : (
              <>
                <div className="grid gap-5 md:grid-cols-2">
                  {topics.map((topic) => {
                    const selected = selectedTopic === topic.id;
                    const deleting = deletingTopic === topic.id;

                    return (
                      <div
                        key={topic.id}
                        className={`rounded-3xl border p-6 transition ${
                          selected
                            ? "border-red-500 bg-red-500/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <button
                            type="button"
                            onClick={() => setSelectedTopic(topic.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
                              From your notes
                            </p>

                            <h3 className="mt-2 text-xl font-semibold">
                              {topic.name}
                            </h3>

                            <p className="mt-5 text-sm text-zinc-500">
                              {topic.sourceNoteTitle}
                            </p>

                            <div className="mt-4 text-sm font-semibold text-red-500">
                              {selected ? "Selected" : "Study this topic"}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteTopic(topic)}
                            disabled={deleting}
                            title="Delete topic"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/5 text-sm text-red-300 transition hover:border-red-400/40 hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {deleting ? "..." : "Delete"}
                          </button>
                        </div>

                        <div className="mt-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-sm text-zinc-500">
                          {selected ? "Selected" : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-zinc-400">
                        {selectedTopicData
                          ? carryoverMode
                            ? "Ready to recover?"
                            : "Ready to focus?"
                          : "Choose a topic"}
                      </p>

                      <h2 className="mt-1 text-xl font-semibold">
                        {selectedTopicData
                          ? selectedTopicData.name
                          : "Select a topic from your notes"}
                      </h2>
                    </div>

                    <button
                      onClick={startSession}
                      disabled={!selectedTopicData}
                      className={`rounded-xl px-6 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        carryoverMode
                          ? "bg-amber-400 text-black hover:bg-amber-300"
                          : "bg-red-500 text-black hover:bg-red-500"
                      }`}
                    >
                      {carryoverMode
                        ? "Start Recovery Session"
                        : "Study This Topic"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}

