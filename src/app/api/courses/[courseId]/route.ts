import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/current-student";

type RouteContext = {
  params: Promise<{
    courseId: string;
  }>;
};

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { courseId } = await context.params;

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
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
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    await prisma.course.delete({
      where: {
        id: course.id,
      },
    });

    return NextResponse.json({
      message: "Course deleted successfully",
      course,
    });
  } catch (error) {
    console.error("Failed to delete course:", error);

    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 }
    );
  }
}