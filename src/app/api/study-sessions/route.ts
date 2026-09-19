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

    const sessions = await prisma.studySession.findMany({
      where: {
        course: {
          studentId: student.id,
        },
        deleted: false,
      },
      include: {
        course: {
          include: {
            semester: true,
          },
        },
      },
      orderBy: [
        {
          date: "asc",
        },
        {
          startTime: "asc",
        },
      ],
    });

    return NextResponse.json({
      sessions,
    });
  } catch (error) {
    console.error("Failed to fetch study sessions:", error);

    return NextResponse.json(
      { error: "Failed to fetch study sessions" },
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

    const courseId = String(body.courseId ?? "").trim();
    const topic = String(body.topic ?? "").trim();
    const date = String(body.date ?? "").trim();
    const startTime = String(body.startTime ?? "").trim();
    const endTime = String(body.endTime ?? "").trim();

    if (!courseId || !topic || !date || !startTime || !endTime) {
      return NextResponse.json(
        {
          error:
            "Course, topic, date, start time, and end time are required",
        },
        { status: 400 }
      );
    }

    if (startTime >= endTime) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        studentId: student.id,
      },
      select: {
        id: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    const session = await prisma.studySession.create({
      data: {
        courseId: course.id,
        topic,
        date: new Date(date),
        startTime,
        endTime,
      },
      include: {
        course: {
          include: {
            semester: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Study session created successfully",
        session,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create study session:", error);

    return NextResponse.json(
      { error: "Failed to create study session" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id")?.trim();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Study session id is required" },
        { status: 400 }
      );
    }

    const session = await prisma.studySession.findFirst({
      where: {
        id: sessionId,
        course: {
          studentId: student.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Study session not found" },
        { status: 404 }
      );
    }

    await prisma.studySession.update({
      where: {
        id: session.id,
      },
      data: {
        deleted: true,
      },
    });

    return NextResponse.json({
      message: "Study session deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete study session:", error);

    return NextResponse.json(
      { error: "Failed to delete study session" },
      { status: 500 }
    );
  }
}