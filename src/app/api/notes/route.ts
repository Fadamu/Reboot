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

    const notes = await prisma.note.findMany({
      where: {
        course: {
          studentId: student.id,
        },
      },
      include: {
        course: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      notes: notes.map((note) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        fileName: note.fileName,
        fileType: note.fileType,
        filePath: note.filePath,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        course: {
          id: note.course.id,
          code: note.course.code,
          name: note.course.name,
          units: note.course.units,
        },
      })),
    });
  } catch (error) {
    console.error("Failed to fetch notes:", error);

    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const courseId = String(body.courseId ?? "").trim();
    const title = String(body.title ?? "").trim();
    const content = String(body.content ?? "").trim();
    const fileName = String(body.fileName ?? "").trim();
    const fileType = String(body.fileType ?? "").trim();
    const filePath = String(body.filePath ?? "").trim();

    if (!courseId || !title || !content) {
      return NextResponse.json(
        { error: "Course, title, and note content are required" },
        { status: 400 }
      );
    }

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
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    const note = await prisma.note.create({
      data: {
        title,
        content,
        fileName: fileName || null,
        fileType: fileType || null,
        filePath: filePath || null,
        courseId: course.id,
      },
      include: {
        course: true,
      },
    });

    return NextResponse.json(
      {
        message: "Note saved successfully",
        note: {
          id: note.id,
          title: note.title,
          content: note.content,
          fileName: note.fileName,
          fileType: note.fileType,
          filePath: note.filePath,
          createdAt: note.createdAt,
          course: {
            id: note.course.id,
            code: note.course.code,
            name: note.course.name,
            units: note.course.units,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create note:", error);

    return NextResponse.json(
      { error: "Failed to save note" },
      { status: 500 }
    );
  }
}