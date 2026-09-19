"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Course = {
  id: string;
  code: string;
  name: string;
  units: number;
};

type Note = {
  id: string;
  title: string;
  content: string;
  fileName: string | null;
  fileType: string | null;
  createdAt: string;
  course: {
    id: string;
    code: string;
    name: string;
    units: number;
  };
};

export default function NotesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadNotesData() {
    try {
      setIsLoading(true);

      const [coursesResponse, notesResponse] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/notes"),
      ]);

      if (!coursesResponse.ok || !notesResponse.ok) {
        throw new Error("Failed to load notes data");
      }

      const coursesData = await coursesResponse.json();
      const notesData = await notesResponse.json();

      setCourses(coursesData.courses ?? []);
      setNotes(notesData.notes ?? []);
    } catch (error) {
      console.error(error);
      alert("Failed to load notes.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadNotesData();
  }, []);

  const courseNoteCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const note of notes) {
      counts[note.course.id] = (counts[note.course.id] ?? 0) + 1;
    }

    return counts;
  }, [notes]);

  const selectedCourse = courses.find(
    (course) => course.id === selectedCourseId
  );

  const selectedCourseNotes = notes.filter(
    (note) => note.course.id === selectedCourseId
  );

  function studyCourse(courseIdToStudy: string) {
    window.location.href = `/study?courseId=${courseIdToStudy}`;
  }

  function selectCourse(id: string) {
    setSelectedCourseId(id);
    setCourseId(id);
  }

  function openAddNote(courseIdToUse?: string) {
    const id = courseIdToUse ?? selectedCourseId;

    if (id) {
      setCourseId(id);
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleUpload() {
    if (!courseId || !uploadTitle.trim() || !uploadFile) {
      alert("Please select a course, PDF file, and title.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();

      formData.append("file", uploadFile);
      formData.append("courseId", courseId);
      formData.append("title", uploadTitle.trim());

      const response = await fetch("/api/notes/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to upload PDF");
      }

      setUploadTitle("");
      setUploadFile(null);

      const fileInput = document.getElementById(
        "pdf-upload"
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      await loadNotesData();

      setSelectedCourseId(courseId);

      alert("PDF processed successfully!");
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to upload PDF."
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!courseId || !title.trim() || !content.trim()) {
      alert("Please complete the course, title, and note content.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          title: title.trim(),
          content: content.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save note");
      }

      setTitle("");
      setContent("");

      await loadNotesData();

      setSelectedCourseId(courseId);

      alert("Note saved successfully!");
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save note."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-red-500">
            REBOOT / Study Engine
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Course Notes
          </h1>

          <p className="mt-3 max-w-2xl text-white/55">
            Keep all your study material organized by course. Your notes
            become the source material REBOOT uses for study assistance
            and personalized quizzes.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
          {/* ADD MATERIAL */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                Study Material
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Add material
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
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Note title
                </label>

                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. TCP/IP Lecture 1"
                  className="w-full rounded-xl border border-white/10 bg-[#0d1118] px-4 py-3 text-sm outline-none transition placeholder:text-white/25 focus:border-red-500/50"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Note content
                </label>

                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Paste or type your study material here..."
                  rows={10}
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#0d1118] px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-white/25 focus:border-red-500/50"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-xl bg-red-500 px-4 py-3 font-semibold text-black transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Note"}
              </button>

              {/* PDF IMPORT */}
              <div className="border-t border-white/10 pt-6">
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                    PDF Import
                  </p>

                  <h3 className="mt-2 text-lg font-semibold">
                    Upload course notes
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-white/40">
                    Upload a readable PDF and REBOOT will extract the text
                    and save it directly under the selected course.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/70">
                      PDF title
                    </label>

                    <input
                      value={uploadTitle}
                      onChange={(event) =>
                        setUploadTitle(event.target.value)
                      }
                      placeholder="e.g. TCP/IP Lecture Notes"
                      className="w-full rounded-xl border border-white/10 bg-[#0d1118] px-4 py-3 text-sm outline-none transition placeholder:text-white/25 focus:border-red-500/50"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="pdf-upload"
                      className="mb-2 block text-sm font-medium text-white/70"
                    >
                      PDF file
                    </label>

                    <input
                      id="pdf-upload"
                      type="file"
                      accept=".pdf,.docx,.pptx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                      onChange={(event) =>
                        setUploadFile(event.target.files?.[0] ?? null)
                      }
                      className="block w-full rounded-xl border border-white/10 bg-[#0d1118] px-4 py-3 text-sm text-white/60 file:mr-4 file:rounded-lg file:border-0 file:bg-red-500 file:px-3 file:py-2 file:font-semibold file:text-black"
                    />

                    <p className="mt-2 text-xs text-white/30">
                      PDF only - Maximum 10MB
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploading ? "Processing PDF..." : "Upload PDF"}
                  </button>
                </div>
              </div>
            </form>
          </section>

          {/* NOTES */}
          <section>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                  Your library
                </p>

                <h2 className="mt-2 text-2xl font-semibold">
                  {selectedCourse
                    ? `${selectedCourse.code} Notes`
                    : "Your Courses"}
                </h2>
              </div>

              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/55">
                {notes.length} {notes.length === 1 ? "note" : "notes"}
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center text-white/40">
                Loading your notes...
              </div>
            ) : courses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                <h3 className="text-lg font-semibold">
                  No courses yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm text-white/40">
                  Add your courses first, then you can organize study
                  material inside each course.
                </p>
              </div>
            ) : !selectedCourseId ? (
              /* COURSE LIBRARY */
              <div className="grid gap-4 sm:grid-cols-2">
                {courses.map((course) => {
                  const count = courseNoteCounts[course.id] ?? 0;

                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => selectCourse(course.id)}
                      className="group rounded-3xl border border-white/10 bg-white/[0.035] p-6 text-left transition hover:-translate-y-0.5 hover:border-red-500/30 hover:bg-red-500/[0.03]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="inline-flex rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold tracking-wide text-red-400">
                            {course.code}
                          </span>

                          <h3 className="mt-4 text-xl font-semibold">
                            {course.name}
                          </h3>

                          <p className="mt-2 text-sm text-white/35">
                            {course.units}{" "}
                            {course.units === 1 ? "unit" : "units"}
                          </p>
                        </div>

                        <div className="flex h-12 min-w-12 items-center justify-center rounded-2xl bg-white/5 px-3 text-sm font-bold text-white/70">
                          {count}
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                        <span className="text-sm text-white/40">
                          {count === 0
                            ? "No notes yet"
                            : `${count} ${
                                count === 1 ? "note" : "notes"
                              }`}
                        </span>

                        <span className="text-sm font-semibold text-red-400 transition group-hover:translate-x-1">
                          Open →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* SELECTED COURSE */
              <div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCourseId("")}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/60 transition hover:border-white/20 hover:text-white"
                  >
                    ← All Courses
                  </button>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => studyCourse(selectedCourseId)}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
                    >
                      Study This Course
                    </button>

                    <button
                      type="button"
                      onClick={() => openAddNote(selectedCourseId)}
                      className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-red-400"
                    >
                      + Add Note
                    </button>
                  </div>
                </div>

                <div className="mb-6 rounded-3xl border border-red-500/15 bg-red-500/[0.04] p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">
                        {selectedCourse?.code}
                      </span>

                      <h3 className="mt-3 text-2xl font-bold">
                        {selectedCourse?.name}
                      </h3>

                      <p className="mt-2 text-sm text-white/40">
                        {selectedCourse?.units}{" "}
                        {selectedCourse?.units === 1 ? "unit" : "units"}{" "}
                        · {selectedCourseNotes.length}{" "}
                        {selectedCourseNotes.length === 1
                          ? "note"
                          : "notes"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/50">
                      Study material
                    </div>
                  </div>
                </div>

                {selectedCourseNotes.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                    <h3 className="text-lg font-semibold">
                      No notes for this course yet
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm text-white/40">
                      Add notes or upload a PDF for {selectedCourse?.code}.
                      REBOOT will use this material in the Study Engine.
                    </p>

                    <button
                      type="button"
                      onClick={() => openAddNote(selectedCourseId)}
                      className="mt-5 rounded-xl bg-red-500 px-5 py-3 font-semibold text-black transition hover:bg-red-400"
                    >
                      Add First Note
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedCourseNotes.map((note) => (
                      <article
                        key={note.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition hover:border-white/20"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400">
                                {note.course.code}
                              </span>

                              {note.fileName && (
                                <span className="rounded-full bg-purple-400/10 px-2.5 py-1 text-xs font-semibold text-purple-300">
                                  PDF
                                </span>
                              )}
                            </div>

                            <h3 className="mt-3 text-xl font-semibold">
                              {note.title}
                            </h3>

                            <p className="mt-1 text-sm text-white/35">
                              {note.course.name}
                            </p>
                          </div>

                          <span className="text-xs text-white/30">
                            {new Date(
                              note.createdAt
                            ).toLocaleDateString()}
                          </span>
                        </div>

                        {note.fileName && (
                          <p className="mt-4 text-xs text-white/30">
                            Source file: {note.fileName}
                          </p>
                        )}

                        <div className="mt-5 max-h-80 overflow-y-auto rounded-xl border border-white/5 bg-black/20 p-4">
                          <p className="whitespace-pre-wrap text-sm leading-7 text-white/60">
                            {note.content}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}




