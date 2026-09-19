"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Course = {
  id: string;
  code: string;
  name: string;
  units: number;
};

type Semester = {
  id: string;
  session: string;
  name: string;
  courseCount: number;
  resultCount: number;
};

const SEMESTER_NAMES = ["First Semester", "Second Semester"];

export default function CoursesPage() {
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);

  const [selectedSession, setSelectedSession] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isAcademicSaving, setIsAcademicSaving] = useState(false);
  const [showAcademicSetup, setShowAcademicSetup] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(
    null
  );

  const [error, setError] = useState("");

  const [newSession, setNewSession] = useState("");
  const [newSemesterName, setNewSemesterName] = useState("First Semester");

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [units, setUnits] = useState("");

  const selectedSemester = useMemo(
    () =>
      semesters.find(
        (semester) => semester.id === selectedSemesterId
      ) ?? null,
    [semesters, selectedSemesterId]
  );

  const availableSemesters = useMemo(
    () =>
      semesters.filter(
        (semester) => semester.session === selectedSession
      ),
    [semesters, selectedSession]
  );

  async function loadAcademicStructure(preferredSemesterId?: string) {
    const response = await fetch("/api/academic", {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ?? "Failed to load academic structure."
      );
    }

    const loadedSessions: string[] = data.sessions ?? [];
    const loadedSemesters: Semester[] = data.semesters ?? [];

    setSessions(loadedSessions);
    setSemesters(loadedSemesters);

    if (loadedSessions.length === 0) {
      setSelectedSession("");
      setSelectedSemesterId("");
      setShowAcademicSetup(true);
      return;
    }

    const sessionToUse =
      selectedSession && loadedSessions.includes(selectedSession)
        ? selectedSession
        : loadedSessions[0];

    setSelectedSession(sessionToUse);

    const sessionSemesters = loadedSemesters.filter(
      (semester) => semester.session === sessionToUse
    );

    const semesterToUse =
      preferredSemesterId &&
      sessionSemesters.some(
        (semester) => semester.id === preferredSemesterId
      )
        ? preferredSemesterId
        : selectedSemesterId &&
            sessionSemesters.some(
              (semester) => semester.id === selectedSemesterId
            )
          ? selectedSemesterId
          : sessionSemesters[0]?.id ?? "";

    setSelectedSemesterId(semesterToUse);
    setShowAcademicSetup(false);

    return {
      sessions: loadedSessions,
      semesters: loadedSemesters,
      selectedSemesterId: semesterToUse,
    };
  }

  async function loadCourses(semesterId: string) {
    if (!semesterId) {
      setCourses([]);
      return;
    }

    const response = await fetch(
      `/api/courses?semesterId=${encodeURIComponent(semesterId)}`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load courses.");
    }

    setCourses(data.courses ?? []);
  }

  async function loadPage() {
    setIsLoading(true);
    setError("");

    try {
      const academic = await loadAcademicStructure();

      if (academic?.selectedSemesterId) {
        await loadCourses(academic.selectedSemesterId);
      } else {
        setCourses([]);
      }
    } catch (error) {
      console.error("Failed to load courses page:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load academic structure."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (!selectedSession) {
      return;
    }

    const sessionSemesters = semesters.filter(
      (semester) => semester.session === selectedSession
    );

    if (
      selectedSemesterId &&
      sessionSemesters.some(
        (semester) => semester.id === selectedSemesterId
      )
    ) {
      return;
    }

    setSelectedSemesterId(sessionSemesters[0]?.id ?? "");
  }, [selectedSession, semesters, selectedSemesterId]);

  useEffect(() => {
    if (!selectedSemesterId) {
      setCourses([]);
      return;
    }

    loadCourses(selectedSemesterId).catch((error) => {
      console.error("Failed to load courses:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load courses."
      );
    });
  }, [selectedSemesterId]);

  function handleSessionChange(session: string) {
    setSelectedSession(session);

    const firstSemester = semesters.find(
      (semester) => semester.session === session
    );

    setSelectedSemesterId(firstSemester?.id ?? "");
    setShowForm(false);
    setError("");
  }

  function openForm() {
    setError("");
    setCode("");
    setName("");
    setUnits("");
    setShowForm(true);
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setShowForm(false);
    setError("");
  }

  async function handleAcademicSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsAcademicSaving(true);

    try {
      const response = await fetch("/api/academic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: newSession,
          semesterName: newSemesterName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to save academic period."
        );
      }

      setNewSession("");
      setNewSemesterName("First Semester");

      await loadAcademicStructure(data.semester.id);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save academic period."
      );
    } finally {
      setIsAcademicSaving(false);
    }
  }

  async function handleAddSemester() {
    if (!selectedSession) {
      return;
    }

    const existing = semesters.find(
      (semester) =>
        semester.session === selectedSession &&
        semester.name === newSemesterName
    );

    if (existing) {
      setSelectedSemesterId(existing.id);
      setShowAcademicSetup(false);
      return;
    }

    setError("");
    setIsAcademicSaving(true);

    try {
      const response = await fetch("/api/academic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: selectedSession,
          semesterName: newSemesterName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to add semester."
        );
      }

      await loadAcademicStructure(data.semester.id);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to add semester."
      );
    } finally {
      setIsAcademicSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSemesterId) {
      setError("Select an academic semester first.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          name,
          units,
          semesterId: selectedSemesterId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to add course.");
      }

      setShowForm(false);
      setCode("");
      setName("");
      setUnits("");

      await loadCourses(selectedSemesterId);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to add course."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(course: Course) {
    const confirmed = window.confirm(
      `Delete ${course.code} - ${course.name}?\n\nThis will also delete its notes, study sessions, study questions, and results. This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setDeletingCourseId(course.id);

    try {
      const response = await fetch(`/api/courses/${course.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to delete course."
        );
      }

      setCourses((currentCourses) =>
        currentCourses.filter(
          (currentCourse) => currentCourse.id !== course.id
        )
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete course."
      );
    } finally {
      setDeletingCourseId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-8 text-sm text-zinc-500 transition hover:text-white"
        >
          Back to dashboard
        </button>

        <div className="mb-10">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Academic Structure
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Courses
          </h1>

          <p className="mt-3 max-w-2xl text-zinc-500">
            Organize your courses by academic session and semester.
            Everything you study in REBOOT will connect back to this
            structure.
          </p>
        </div>

        {isLoading ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-14 text-center">
              <p className="text-sm text-zinc-500">
                Loading your academic structure...
              </p>
            </div>
          </section>
        ) : showAcademicSetup ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Start here
              </p>

              <h2 className="mt-3 text-2xl font-semibold">
                Set up your academic year
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Create your first academic session and semester. Your
                courses, results, notes, and study activity will all
                belong to this structure.
              </p>
            </div>

            <form
              onSubmit={handleAcademicSetup}
              className="mt-8 max-w-2xl space-y-5"
            >
              <div>
                <label
                  htmlFor="academic-session"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Academic session
                </label>

                <input
                  id="academic-session"
                  type="text"
                  value={newSession}
                  onChange={(event) =>
                    setNewSession(event.target.value)
                  }
                  placeholder="e.g. 2026/2027"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-white/30"
                />
              </div>

              <div>
                <label
                  htmlFor="academic-semester"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Semester
                </label>

                <select
                  id="academic-semester"
                  value={newSemesterName}
                  onChange={(event) =>
                    setNewSemesterName(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                >
                  {SEMESTER_NAMES.map((semester) => (
                    <option key={semester} value={semester}>
                      {semester}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isAcademicSaving}
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAcademicSaving
                  ? "Setting up..."
                  : "Create academic period"}
              </button>
            </form>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="session-select"
                    className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500"
                  >
                    Academic session
                  </label>

                  <select
                    id="session-select"
                    value={selectedSession}
                    onChange={(event) =>
                      handleSessionChange(event.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-4 py-3 text-sm font-medium text-white outline-none transition focus:border-white/30"
                  >
                    {sessions.map((session) => (
                      <option key={session} value={session}>
                        {session}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="semester-select"
                    className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500"
                  >
                    Semester
                  </label>

                  <select
                    id="semester-select"
                    value={selectedSemesterId}
                    onChange={(event) =>
                      setSelectedSemesterId(event.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-4 py-3 text-sm font-medium text-white outline-none transition focus:border-white/30"
                  >
                    {availableSemesters.map((semester) => (
                      <option key={semester.id} value={semester.id}>
                        {semester.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-500">
                  Managing{" "}
                  <span className="text-zinc-300">
                    {selectedSession}
                  </span>{" "}
                  •{" "}
                  <span className="text-zinc-300">
                    {selectedSemester?.name}
                  </span>
                </p>

                {availableSemesters.length < 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewSemesterName(
                        availableSemesters.some(
                          (semester) =>
                            semester.name === "First Semester"
                        )
                          ? "Second Semester"
                          : "First Semester"
                      );
                      handleAddSemester();
                    }}
                    disabled={isAcademicSaving}
                    className="text-sm font-medium text-zinc-400 transition hover:text-white disabled:opacity-50"
                  >
                    + Add other semester
                  </button>
                )}
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
                    {selectedSession}
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold">
                    {selectedSemester?.name}
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    {courses.length}{" "}
                    {courses.length === 1 ? "course" : "courses"} in
                    this semester.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openForm}
                  disabled={!selectedSemesterId}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add course
                </button>
              </div>

              {showForm && (
                <div className="mt-8 rounded-2xl border border-white/10 bg-[#0d0f14] p-6">
                  <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
                      {selectedSession} • {selectedSemester?.name}
                    </p>

                    <h3 className="mt-2 text-lg font-semibold">
                      Add a course
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      This course will belong to the selected semester.
                    </p>
                  </div>

                  <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                  >
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label
                          htmlFor="course-code"
                          className="mb-2 block text-sm font-medium text-zinc-300"
                        >
                          Course code
                        </label>

                        <input
                          id="course-code"
                          type="text"
                          value={code}
                          onChange={(event) =>
                            setCode(event.target.value)
                          }
                          placeholder="e.g. CSC 201"
                          required
                          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-white/30"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="course-units"
                          className="mb-2 block text-sm font-medium text-zinc-300"
                        >
                          Credit units
                        </label>

                        <input
                          id="course-units"
                          type="number"
                          min="1"
                          max="10"
                          value={units}
                          onChange={(event) =>
                            setUnits(event.target.value)
                          }
                          placeholder="e.g. 3"
                          required
                          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-white/30"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="course-name"
                        className="mb-2 block text-sm font-medium text-zinc-300"
                      >
                        Course name
                      </label>

                      <input
                        id="course-name"
                        type="text"
                        value={name}
                        onChange={(event) =>
                          setName(event.target.value)
                        }
                        placeholder="e.g. Data Structures and Algorithms"
                        required
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-white/30"
                      />
                    </div>

                    {error && (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                        {error}
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={closeForm}
                        disabled={isSaving}
                        className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={isSaving}
                        className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSaving ? "Saving..." : "Save course"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {error && !showForm && (
                <div className="mt-8 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="mt-8">
                {courses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
                    <p className="text-lg font-medium text-zinc-300">
                      No courses in this semester
                    </p>

                    <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                      Add your first course to{" "}
                      {selectedSemester?.name}.
                    </p>

                    <button
                      type="button"
                      onClick={openForm}
                      className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
                    >
                      Add first course
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {courses.map((course) => {
                      const isDeleting =
                        deletingCourseId === course.id;

                      return (
                        <div
                          key={course.id}
                          className="rounded-2xl border border-white/10 bg-[#0d0f14] p-6 transition hover:border-white/20"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                                {course.code}
                              </p>

                              <h3 className="mt-3 text-lg font-semibold">
                                {course.name}
                              </h3>
                            </div>

                            <span className="shrink-0 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/60">
                              {course.units}{" "}
                              {course.units === 1
                                ? "unit"
                                : "units"}
                            </span>
                          </div>

                          <div className="mt-6 flex justify-end border-t border-white/5 pt-4">
                            <button
                              type="button"
                              onClick={() => handleDelete(course)}
                              disabled={
                                deletingCourseId !== null
                              }
                              className="rounded-lg px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isDeleting
                                ? "Deleting..."
                                : "Delete course"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

