import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/current-student";

const GRADE_POINTS: Record<string, number> = {
  A: 4.0,
  "A-": 3.75,
  "B+": 3.25,
  B: 3.0,
  "B-": 2.75,
  "C+": 2.25,
  C: 2.0,
  "C-": 1.75,
  D: 1.0,
  F: 0.0,
};

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

    const courseCode = String(body.courseCode ?? "").trim().toUpperCase();
    const courseName = String(body.courseName ?? "").trim();
    const units = Number(body.units);
    const grade = String(body.grade ?? "").trim().toUpperCase();
    const session = String(body.session ?? "").trim();
    const semesterName = String(body.semesterName ?? "").trim();

    if (
      !courseCode ||
      !courseName ||
      !session ||
      !semesterName
    ) {
      return NextResponse.json(
        {
          error:
            "Course code, course name, session, and semester are required",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(units) || units < 1 || units > 10) {
      return NextResponse.json(
        { error: "Units must be a whole number between 1 and 10" },
        { status: 400 }
      );
    }

    if (!(grade in GRADE_POINTS)) {
      return NextResponse.json(
        { error: "Invalid grade" },
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

    const course = await prisma.course.upsert({
      where: {
        studentId_semesterId_code: {
          studentId: student.id,
          semesterId: semester.id,
          code: courseCode,
        },
      },
      update: {
        name: courseName,
        units,
      },
      create: {
        code: courseCode,
        name: courseName,
        units,
        studentId: student.id,
        semesterId: semester.id,
      },
    });

    const existingResult = await prisma.result.findUnique({
      where: {
        courseId_semesterId: {
          courseId: course.id,
          semesterId: semester.id,
        },
      },
    });

    if (existingResult) {
      return NextResponse.json(
        {
          error:
            "This course already has a result for this semester",
        },
        { status: 409 }
      );
    }

    const result = await prisma.result.create({
      data: {
        grade,
        gradePoint: GRADE_POINTS[grade],
        courseId: course.id,
        semesterId: semester.id,
      },
      include: {
        course: true,
        semester: true,
      },
    });

    return NextResponse.json(
      {
        message: "Result saved successfully",
        result: {
          id: result.id,
          session: result.semester.session,
          semester: result.semester.name,
          courseCode: result.course.code,
          courseName: result.course.name,
          units: result.course.units,
          grade: result.grade,
          gradePoint: result.gradePoint,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to save result:", error);

    return NextResponse.json(
      { error: "Failed to save result" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const fullStudent = await prisma.student.findUnique({
      where: {
        id: student.id,
      },
      include: {
        semesters: {
          include: {
            results: {
              include: {
                course: true,
              },
            },
          },
          orderBy: [
            {
              session: "desc",
            },
            {
              name: "asc",
            },
          ],
        },
      },
    });

    if (!fullStudent) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    const results = fullStudent.semesters.flatMap((semester) =>
      semester.results.map((result) => ({
        id: result.id,
        session: semester.session,
        semester: semester.name,
        courseCode: result.course.code,
        courseName: result.course.name,
        units: result.course.units,
        grade: result.grade,
        gradePoint:
          GRADE_POINTS[result.grade] ?? result.gradePoint,
      }))
    );

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

    return NextResponse.json({
      student: {
        id: fullStudent.id,
        name: fullStudent.name,
      },
      results,
      summary: {
        totalUnits,
        cgpa: Number(cgpa.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Failed to fetch results:", error);

    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}