import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/current-student";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const courseId = String(body.courseId ?? "").trim();
    const topic = String(body.topic ?? "").trim();
    const dateValue = String(body.date ?? "").trim();
    const startTime = String(body.startTime ?? "").trim();
    const endTime = String(body.endTime ?? "").trim();

    if (!courseId || !topic) {
      return NextResponse.json(
        { error: "Course and topic are required." },
        { status: 400 }
      );
    }

    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        studentId: student.id,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found." },
        { status: 404 }
      );
    }

    const date = dateValue ? new Date(dateValue) : new Date();

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Invalid study date." },
        { status: 400 }
      );
    }

    const session = await prisma.studySession.create({
      data: {
        date,
        startTime: startTime || "00:00",
        endTime: endTime || "00:00",
        topic,
        courseId: course.id,
      },
      include: {
        course: true,
      },
    });

    return NextResponse.json(
      {
        message: "Study session created successfully.",
        session: {
          id: session.id,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          topic: session.topic,
          completed: session.completed,
          course: {
            id: session.course.id,
            code: session.course.code,
            name: session.course.name,
            units: session.course.units,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create study session:", error);

    return NextResponse.json(
      { error: "Failed to create study session." },
      { status: 500 }
    );
  }
}