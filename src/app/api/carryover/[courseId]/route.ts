import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/current-student";

export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;

    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        studentId: student.id,
      },
      include: {
        semester: true,
        results: {
          orderBy: {
            createdAt: "desc",
          },
        },
        notes: {
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        studyTopics: {
          where: {
            deleted: false,
          },
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        studySessions: {
          select: {
            id: true,
            topic: true,
            completed: true,
            date: true,
          },
          orderBy: {
            date: "desc",
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    const currentResult = course.results[0];

    if (!currentResult || currentResult.grade !== "F") {
      return NextResponse.json(
        {
          error:
            "This course is not currently an active carryover.",
        },
        { status: 409 }
      );
    }

    const completedSessions = course.studySessions.filter(
      (session) => session.completed
    ).length;

    const totalSessions = course.studySessions.length;

    const studyProgress =
      totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0;

    return NextResponse.json({
      course: {
        id: course.id,
        code: course.code,
        name: course.name,
        units: course.units,
      },

      originalResult: {
        id: currentResult.id,
        grade: currentResult.grade,
        gradePoint: currentResult.gradePoint,
        session: course.semester.session,
        semester: course.semester.name,
      },

      recovery: {
        progress: studyProgress,
        completedSessions,
        totalSessions,
        notesCount: course.notes.length,
        topicsCount: course.studyTopics.length,
      },

      notes: course.notes,

      topics: course.studyTopics,

      studySessions: course.studySessions,
    });
  } catch (error) {
    console.error("Failed to load recovery course:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load recovery course",
      },
      { status: 500 }
    );
  }
}