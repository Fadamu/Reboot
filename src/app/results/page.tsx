"use client";

import { useEffect, useMemo, useState } from "react";

const grades = [
  { grade: "A", point: 4.0 },
  { grade: "A-", point: 3.75 },
  { grade: "B+", point: 3.25 },
  { grade: "B", point: 3.0 },
  { grade: "B-", point: 2.75 },
  { grade: "C+", point: 2.25 },
  { grade: "C", point: 2.0 },
  { grade: "C-", point: 1.75 },
  { grade: "D", point: 1.0 },
  { grade: "F", point: 0.0 },
];

type AcademicProfile = {
  id: string;
  studentId: string;
  school: string;
  department: string;
  program: string;
  programDurationYears: number;
  startYear: number;
};

type Result = {
  id: string;
  session: string;
  semester: string;
  courseCode: string;
  courseName: string;
  units: number;
  grade: string;
  gradePoint: number;
};

type AcademicSemester = {
  session: string;
  name: string;
  yearNumber: number;
};

type AcademicYear = {
  yearNumber: number;
  startYear: number;
  session: string;
  semesters: AcademicSemester[];
};

function getSessionLabel(startYear: number) {
  return `${startYear}/${startYear + 1}`;
}

function buildAcademicYears(
  startYear: number,
  duration: number
): AcademicYear[] {
  return Array.from({ length: duration }, (_, index) => {
    const yearNumber = index + 1;
    const academicStartYear = startYear + index;
    const session = getSessionLabel(academicStartYear);

    return {
      yearNumber,
      startYear: academicStartYear,
      session,
      semesters: [
        {
          session,
          name: "First Semester",
          yearNumber,
        },
        {
          session,
          name: "Second Semester",
          yearNumber,
        },
      ],
    };
  });
}

export default function ResultsPage() {
  const [profile, setProfile] = useState<AcademicProfile | null>(null);
  const [results, setResults] = useState<Result[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingResult, setIsSavingResult] = useState(false);

  const [profileError, setProfileError] = useState("");
  const [saveError, setSaveError] = useState("");

  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showAddResult, setShowAddResult] = useState(false);

  const [selectedSemester, setSelectedSemester] =
    useState<AcademicSemester | null>(null);

  const [expandedYears, setExpandedYears] = useState<number[]>([]);

  const [school, setSchool] = useState("");
  const [department, setDepartment] = useState("");
  const [program, setProgram] = useState("");
  const [programDuration, setProgramDuration] = useState("4");
  const [startYear, setStartYear] = useState(
    String(new Date().getFullYear())
  );

  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [units, setUnits] = useState("");
  const [grade, setGrade] = useState("");

  async function loadAcademicData() {
    try {
      setIsLoading(true);
      setProfileError("");

      const [profileResponse, resultsResponse] = await Promise.all([
        fetch("/api/academic-profile"),
        fetch("/api/results"),
      ]);

      const profileData = await profileResponse.json();
      const resultsData = await resultsResponse.json();

      if (
        !profileResponse.ok &&
        profileResponse.status !== 404
      ) {
        throw new Error(
          profileData.error ?? "Failed to load academic profile."
        );
      }

      if (!resultsResponse.ok) {
        throw new Error(
          resultsData.error ?? "Failed to load results."
        );
      }

      if (profileData.profile) {
        setProfile(profileData.profile);

        setSchool(profileData.profile.school);
        setDepartment(profileData.profile.department);
        setProgram(profileData.profile.program);
        setProgramDuration(
          String(profileData.profile.programDurationYears)
        );
        setStartYear(String(profileData.profile.startYear));

        const firstYear = profileData.profile.startYear;
        setExpandedYears([1]);

        void firstYear;
      } else {
        setShowProfileSetup(true);
      }

      setResults(resultsData.results ?? []);
    } catch (error) {
      console.error("Failed to load academic data:", error);

      setProfileError(
        error instanceof Error
          ? error.message
          : "Failed to load academic information."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAcademicData();
  }, []);

  const academicYears = useMemo(() => {
    if (!profile) {
      return [];
    }

    return buildAcademicYears(
      profile.startYear,
      profile.programDurationYears
    );
  }, [profile]);

  const totalUnits = results.reduce(
    (sum, result) => sum + result.units,
    0
  );

  const totalQualityPoints = results.reduce(
    (sum, result) =>
      sum + result.units * result.gradePoint,
    0
  );

  const cgpa =
    totalUnits > 0
      ? totalQualityPoints / totalUnits
      : 0;

  const carryoverCount = results.filter(
    (result) => result.grade === "F"
  ).length;

  function getSemesterResults(
    semester: AcademicSemester
  ) {
    return results.filter(
      (result) =>
        result.session === semester.session &&
        result.semester === semester.name
    );
  }

  function getSemesterStats(
    semester: AcademicSemester
  ) {
    const semesterResults = getSemesterResults(semester);

    const units = semesterResults.reduce(
      (sum, result) => sum + result.units,
      0
    );

    const qualityPoints = semesterResults.reduce(
      (sum, result) =>
        sum + result.units * result.gradePoint,
      0
    );

    const gpa =
      units > 0
        ? qualityPoints / units
        : 0;

    return {
      results: semesterResults,
      units,
      gpa,
    };
  }

  function toggleYear(yearNumber: number) {
    setExpandedYears((current) =>
      current.includes(yearNumber)
        ? current.filter((year) => year !== yearNumber)
        : [...current, yearNumber]
    );
  }

  async function handleSaveProfile() {
    setProfileError("");

    const trimmedSchool = school.trim();
    const trimmedDepartment = department.trim();
    const trimmedProgram = program.trim();
    const parsedDuration = Number(programDuration);
    const parsedStartYear = Number(startYear);

    if (
      !trimmedSchool ||
      !trimmedDepartment ||
      !trimmedProgram
    ) {
      setProfileError(
        "Please fill in your school, department, and program."
      );
      return;
    }

    if (
      !Number.isInteger(parsedDuration) ||
      parsedDuration < 1 ||
      parsedDuration > 10
    ) {
      setProfileError(
        "Program duration must be between 1 and 10 years."
      );
      return;
    }

    if (
      !Number.isInteger(parsedStartYear) ||
      parsedStartYear < 2000 ||
      parsedStartYear > 2100
    ) {
      setProfileError("Please enter a valid start year.");
      return;
    }

    try {
      setIsSavingProfile(true);

      const response = await fetch("/api/academic-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          school: trimmedSchool,
          department: trimmedDepartment,
          program: trimmedProgram,
          programDurationYears: parsedDuration,
          startYear: parsedStartYear,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setProfileError(
          data.error ?? "Failed to save academic profile."
        );
        return;
      }

      setProfile(data.profile);
      setExpandedYears([1]);
      setShowProfileSetup(false);
    } catch (error) {
      console.error("Failed to save academic profile:", error);

      setProfileError(
        "Could not connect to the server."
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  function openAddResult(semester: AcademicSemester) {
    setSelectedSemester(semester);
    setSaveError("");
    setCourseCode("");
    setCourseName("");
    setUnits("");
    setGrade("");
    setShowAddResult(true);
  }

  async function handleSaveResult() {
    setSaveError("");

    if (!selectedSemester) {
      setSaveError("Please select a semester.");
      return;
    }

    const trimmedCode = courseCode.trim();
    const trimmedName = courseName.trim();
    const parsedUnits = Number(units);

    if (
      !trimmedCode ||
      !trimmedName ||
      !units ||
      !grade
    ) {
      setSaveError("Please fill in all fields.");
      return;
    }

    if (
      !Number.isInteger(parsedUnits) ||
      parsedUnits < 1 ||
      parsedUnits > 10
    ) {
      setSaveError(
        "Units must be a whole number between 1 and 10."
      );
      return;
    }

    try {
      setIsSavingResult(true);

      const response = await fetch("/api/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseCode: trimmedCode,
          courseName: trimmedName,
          units: parsedUnits,
          grade,
          session: selectedSemester.session,
          semesterName: selectedSemester.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSaveError(
          data.error ?? "Failed to save result."
        );
        return;
      }

      setCourseCode("");
      setCourseName("");
      setUnits("");
      setGrade("");
      setShowAddResult(false);

      await loadAcademicData();
    } catch (error) {
      console.error("Failed to save result:", error);

      setSaveError(
        "Could not connect to the server."
      );
    } finally {
      setIsSavingResult(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#08090c] px-6 py-12 text-white md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-sm text-zinc-500">
              Loading your academic command center...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!profile || showProfileSetup) {
    return (
      <main className="min-h-screen bg-[#08090c] px-6 py-10 text-white md:px-10">
        <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center">
          <section className="w-full rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 shadow-2xl md:p-10">
            <div className="mb-8">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-red-500">
                Academic Setup
              </p>

              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Let&apos;s build your academic journey.
              </h1>

              <p className="mt-4 max-w-2xl text-zinc-400">
                Tell REBOOT about your school and program first.
                We&apos;ll use this information to build your
                personal academic timeline.
              </p>
            </div>

            {profileError && (
              <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                {profileError}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  School / Institution
                </label>

                <input
                  type="text"
                  value={school}
                  onChange={(event) =>
                    setSchool(event.target.value)
                  }
                  placeholder="e.g. American University of Science and Technology"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Department
                </label>

                <input
                  type="text"
                  value={department}
                  onChange={(event) =>
                    setDepartment(event.target.value)
                  }
                  placeholder="e.g. Computer Science"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Course / Program
                </label>

                <input
                  type="text"
                  value={program}
                  onChange={(event) =>
                    setProgram(event.target.value)
                  }
                  placeholder="e.g. B.Sc. Computer Science"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500/50"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Program Duration
                  </label>

                  <select
                    value={programDuration}
                    onChange={(event) =>
                      setProgramDuration(event.target.value)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-[#111318] px-4 py-4 text-white outline-none focus:border-red-500/50"
                  >
                    {Array.from(
                      { length: 10 },
                      (_, index) => index + 1
                    ).map((year) => (
                      <option
                        key={year}
                        value={year}
                        className="bg-[#111318]"
                      >
                        {year} {year === 1 ? "year" : "years"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Start Year
                  </label>

                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={startYear}
                    onChange={(event) =>
                      setStartYear(event.target.value)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-white outline-none focus:border-red-500/50"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.04] p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
                  Your timeline
                </p>

                <p className="mt-2 text-sm text-zinc-400">
                  REBOOT will create a{" "}
                  <span className="font-semibold text-white">
                    {programDuration}-year
                  </span>{" "}
                  academic timeline starting from{" "}
                  <span className="font-semibold text-white">
                    {startYear}
                  </span>
                  .
                </p>

                <p className="mt-2 text-xs text-zinc-500">
                  Future semesters are only displayed. They
                  won&apos;t be stored until you actually add results.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="w-full rounded-2xl bg-red-500 px-5 py-4 text-sm font-bold text-black transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingProfile
                  ? "Building your timeline..."
                  : "Build My Academic Timeline"}
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#08090c] px-6 py-8 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-red-500">
                Academic Command Center
              </p>

              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Results
              </h1>

              <p className="mt-3 max-w-2xl text-zinc-400">
                Your academic history, GPA, CGPA, and recovery
                journey live here.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowProfileSetup(true)}
              className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.05] hover:text-white"
            >
              Edit Academic Profile
            </button>
          </div>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-zinc-500">Program</p>
            <p className="mt-2 font-semibold text-white">
              {profile.program}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-zinc-500">Department</p>
            <p className="mt-2 font-semibold text-white">
              {profile.department}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-zinc-500">Program Duration</p>
            <p className="mt-2 font-semibold text-white">
              {profile.programDurationYears}{" "}
              {profile.programDurationYears === 1
                ? "year"
                : "years"}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-zinc-500">School</p>
            <p className="mt-2 font-semibold text-white">
              {profile.school}
            </p>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-zinc-500">Overall CGPA</p>
            <p className="mt-2 text-4xl font-bold">
              {totalUnits > 0 ? cgpa.toFixed(2) : "-"}
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              / 4.00
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-zinc-500">Total Units</p>
            <p className="mt-2 text-4xl font-bold">
              {totalUnits}
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              Recorded so far
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-zinc-500">Results</p>
            <p className="mt-2 text-4xl font-bold">
              {results.length}
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              Courses recorded
            </p>
          </div>

          <div className="rounded-3xl border border-red-400/10 bg-red-400/[0.03] p-6">
            <p className="text-sm text-zinc-500">Carryovers</p>
            <p className="mt-2 text-4xl font-bold">
              {carryoverCount}
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              Active F results
            </p>
          </div>
        </section>

        {profileError && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {profileError}
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Academic Timeline
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Your academic journey
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Add your actual results to each semester. Future
              semesters remain empty until you need them.
            </p>
          </div>

          <div className="space-y-4">
            {academicYears.map((year) => {
              const isExpanded = expandedYears.includes(
                year.yearNumber
              );

              const yearResults = results.filter(
                (result) =>
                  result.session === year.session
              );

              const yearUnits = yearResults.reduce(
                (sum, result) => sum + result.units,
                0
              );

              return (
                <div
                  key={year.yearNumber}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-black/10"
                >
                  <button
                    type="button"
                    onClick={() =>
                      toggleYear(year.yearNumber)
                    }
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-white/[0.03]"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
                        Year {year.yearNumber}
                      </p>

                      <h3 className="mt-1 text-xl font-bold">
                        {year.session}
                      </h3>

                      <p className="mt-1 text-xs text-zinc-500">
                        {yearUnits > 0
                          ? `${yearUnits} units recorded`
                          : "No results recorded yet"}
                      </p>
                    </div>

                    <span className="text-xl text-zinc-500">
                      {isExpanded ? "−" : "+"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-white/10 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        {year.semesters.map((semester) => {
                          const stats =
                            getSemesterStats(semester);

                          return (
                            <div
                              key={`${semester.session}-${semester.name}`}
                              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
                            >
                              <div className="mb-5 flex items-start justify-between gap-4">
                                <div>
                                  <p className="text-sm font-semibold text-white">
                                    {semester.name}
                                  </p>

                                  <p className="mt-1 text-xs text-zinc-500">
                                    {stats.results.length > 0
                                      ? `${stats.results.length} courses • ${stats.units} units`
                                      : "No results yet"}
                                  </p>
                                </div>

                                <div className="text-right">
                                  <p className="text-xs text-zinc-600">
                                    GPA
                                  </p>

                                  <p className="font-bold text-white">
                                    {stats.units > 0
                                      ? stats.gpa.toFixed(2)
                                      : "-"}
                                  </p>
                                </div>
                              </div>

                              {stats.results.length > 0 ? (
                                <div className="mb-4 space-y-2">
                                  {stats.results.map(
                                    (result) => (
                                      <div
                                        key={result.id}
                                        className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3"
                                      >
                                        <div className="min-w-0">
                                          <p className="font-semibold text-white">
                                            {result.courseCode}
                                          </p>

                                          <p className="truncate text-xs text-zinc-500">
                                            {result.courseName}
                                          </p>
                                        </div>

                                        <div className="ml-3 flex items-center gap-4 text-sm">
                                          <span className="text-zinc-500">
                                            {result.units}u
                                          </span>

                                          <span
                                            className={`font-bold ${
                                              result.grade === "F"
                                                ? "text-red-400"
                                                : "text-white"
                                            }`}
                                          >
                                            {result.grade}
                                          </span>

                                          <span className="hidden text-zinc-500 sm:inline">
                                            {result.gradePoint.toFixed(
                                              2
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <div className="mb-4 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center">
                                  <p className="text-sm text-zinc-500">
                                    No results recorded for this
                                    semester.
                                  </p>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  openAddResult(semester)
                                }
                                className="w-full rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/[0.1]"
                              >
                                + Add Result
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold">
            AUST Grade Scale
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {grades.map((item) => (
              <div
                key={item.grade}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
              >
                <p className="text-lg font-bold">
                  {item.grade}
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  {item.point.toFixed(2)} points
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {showAddResult && selectedSemester && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center">
            <div className="my-auto w-full max-w-lg rounded-3xl border border-white/10 bg-[#111318] p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
                    Add Result
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    {selectedSemester.name}
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    {selectedSemester.session}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowAddResult(false)
                  }
                  className="rounded-xl border border-white/10 px-3 py-2 text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
                >
                  X
                </button>
              </div>

              {saveError && (
                <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                  {saveError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Course Code
                  </label>

                  <input
                    type="text"
                    value={courseCode}
                    onChange={(event) =>
                      setCourseCode(event.target.value)
                    }
                    placeholder="e.g. CSC 301"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Course Name
                  </label>

                  <input
                    type="text"
                    value={courseName}
                    onChange={(event) =>
                      setCourseName(event.target.value)
                    }
                    placeholder="e.g. Software Engineering"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500/50"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">
                      Units
                    </label>

                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={units}
                      onChange={(event) =>
                        setUnits(event.target.value)
                      }
                      placeholder="3"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500/50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">
                      Grade
                    </label>

                    <select
                      value={grade}
                      onChange={(event) =>
                        setGrade(event.target.value)
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#111318] px-4 py-3 text-white outline-none transition focus:border-red-500/50"
                    >
                      <option
                        value=""
                        disabled
                        className="bg-[#111318] text-zinc-500"
                      >
                        Select grade
                      </option>

                      {grades.map((item) => (
                        <option
                          key={item.grade}
                          value={item.grade}
                          className="bg-[#111318] text-white"
                        >
                          {item.grade} —{" "}
                          {item.point.toFixed(2)} points
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Semester
                  </p>

                  <p className="mt-1 font-medium text-white">
                    {selectedSemester.session}{" "}
                    {selectedSemester.name}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowAddResult(false)
                    }
                    className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.05]"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveResult}
                    disabled={isSavingResult}
                    className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingResult
                      ? "Saving..."
                      : "Save Result"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

