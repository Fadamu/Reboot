import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/current-student";

const SEMESTER_NAMES = ["First Semester", "Second Semester"];

export async function GET() {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const semesters = await prisma.semester.findMany({
      where: {
        studentId: student.id,
      },
      orderBy: [
        {
          session: "desc",
        },
        {
          name: "asc",
        },
      ],
      include: {
        _count: {
          select: {
            courses: true,
            results: true,
          },
        },
      },
    });

    const sessions = Array.from(
      new Set(semesters.map((semester) => semester.session))
    );

    return NextResponse.json({
      sessions,
      semesters: semesters.map((semester) => ({
        id: semester.id,
        session: semester.session,
        name: semester.name,
        courseCount: semester._count.courses,
        resultCount: semester._count.results,
      })),
      semesterNames: SEMESTER_NAMES,
    });
  } catch (error) {
    console.error("Failed to fetch academic structure:", error);

    return NextResponse.json(
      { error: "Failed to fetch academic structure" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const session = String(body.session ?? "").trim();
    const semesterName = String(body.semesterName ?? "").trim();

    if (!session || !semesterName) {
      return NextResponse.json(
        { error: "Academic session and semester are required" },
        { status: 400 }
      );
    }

    if (!/^\d{4}\/\d{4}$/.test(session)) {
      return NextResponse.json(
        { error: "Academic session must look like 2026/2027" },
        { status: 400 }
      );
    }

    if (!SEMESTER_NAMES.includes(semesterName)) {
      return NextResponse.json(
        { error: "Invalid semester" },
        { status: 400 }
      );
    }

    const semester = await prisma.semester.upsert({
      where: {
        studentId_session_name: {
          studentId: student.id,
          session,
          name: semesterName,
        },
      },
      update: {},
      create: {
        session,
        name: semesterName,
        studentId: student.id,
      },
    });

    return NextResponse.json(
      {
        message: "Academic period saved successfully",
        semester: {
          id: semester.id,
          session: semester.session,
          name: semester.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to save academic period:", error);

    return NextResponse.json(
      { error: "Failed to save academic period" },
      { status: 500 }
    );
  }
}