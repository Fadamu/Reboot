import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/current-student";

const PASSING_GRADES = new Set([
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D",
]);

export async function GET() {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const courses = await prisma.course.findMany({
      where: {
        studentId: student.id,
      },
      include: {
        semester: true,
        results: {
          include: {
            semester: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        code: "asc",
      },
    });

    const carryovers = [];

    for (const course of courses) {
      const results = [...course.results].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );

      const latestResult = results[0];

      if (!latestResult) {
        continue;
      }

      if (PASSING_GRADES.has(latestResult.grade)) {
        continue;
      }

      if (latestResult.grade !== "F") {
        continue;
      }

      carryovers.push({
        id: latestResult.id,
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        units: course.units,
        grade: latestResult.grade,
        gradePoint: latestResult.gradePoint,
        session: latestResult.semester.session,
        semester: latestResult.semester.name,
        status: "ACTIVE",
      });
    }

    const totalUnits = carryovers.reduce(
      (sum, carryover) => sum + carryover.units,
      0
    );

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
      },
      carryovers,
      summary: {
        total: carryovers.length,
        totalUnits,
      },
    });
  } catch (error) {
    console.error("Failed to fetch carryovers:", error);

    return NextResponse.json(
      { error: "Failed to load carryovers" },
      { status: 500 }
    );
  }
}