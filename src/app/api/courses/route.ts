import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/current-student";

export async function GET(request: Request) {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const semesterId = searchParams.get("semesterId");

    const courses = await prisma.course.findMany({
      where: {
        studentId: student.id,
        ...(semesterId ? { semesterId } : {}),
      },
      orderBy: {
        code: "asc",
      },
      include: {
        semester: true,
        notes: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            title: true,
            fileName: true,
            fileType: true,
          },
        },
      },
    });

    return NextResponse.json({
      courses,
    });
  } catch (error) {
    console.error("Failed to fetch courses:", error);

    return NextResponse.json(
      { error: "Failed to fetch courses" },
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

    const code = String(body.code ?? "").trim().toUpperCase();
    const name = String(body.name ?? "").trim();
    const units = Number(body.units);
    const semesterId = String(body.semesterId ?? "").trim();

    if (!code || !name || !semesterId) {
      return NextResponse.json(
        {
          error:
            "Course code, course name, units, and semester are required",
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

    const semester = await prisma.semester.findFirst({
      where: {
        id: semesterId,
        studentId: student.id,
      },
      select: {
        id: true,
        session: true,
        name: true,
      },
    });

    if (!semester) {
      return NextResponse.json(
        { error: "Semester not found" },
        { status: 404 }
      );
    }

    const existingCourse = await prisma.course.findUnique({
      where: {
        studentId_semesterId_code: {
          studentId: student.id,
          semesterId: semester.id,
          code,
        },
      },
    });

    if (existingCourse) {
      return NextResponse.json(
        { error: "This course already exists in this semester" },
        { status: 409 }
      );
    }

    const course = await prisma.course.create({
      data: {
        code,
        name,
        units,
        studentId: student.id,
        semesterId: semester.id,
      },
      include: {
        semester: true,
        notes: {
          select: {
            id: true,
            title: true,
            fileName: true,
            fileType: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Course created successfully",
        course,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create course:", error);

    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}