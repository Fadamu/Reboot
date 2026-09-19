import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/current-student";

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
        courses: true,
        semesters: true,
      },
    });

    if (!fullStudent) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(fullStudent);
  } catch (error) {
    console.error("Failed to fetch student:", error);

    return NextResponse.json(
      { error: "Failed to fetch student" },
      { status: 500 }
    );
  }
}