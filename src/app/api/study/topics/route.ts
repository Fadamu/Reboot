import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/current-student";

function cleanText(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function looksLikeHeading(line: string) {
  const text = cleanText(line);

  if (!text || text.length < 3 || text.length > 100) {
    return false;
  }

  if (/^[0-9]+[.)]\s+/.test(text)) {
    return true;
  }

  if (/^[0-9]+(\.[0-9]+)*\s+/.test(text)) {
    return true;
  }

  if (
    /^(chapter|unit|module|topic|lesson|section|lecture)\b/i.test(text)
  ) {
    return true;
  }

  const letters = text.replace(/[^A-Za-z]/g, "");

  if (letters.length >= 5 && text === text.toUpperCase()) {
    return true;
  }

  return false;
}

function normalizeTopic(text: string) {
  return text
    .replace(/^[0-9]+(\.[0-9]+)*[.)]?\s*/i, "")
    .replace(
      /^(chapter|unit|module|topic|lesson|section|lecture)\s*[:.-]?\s*/i,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericNoteTitle(title: string) {
  const normalized = title
    .toLowerCase()
    .replace(/\.(pdf|docx?|pptx?|txt)$/i, "")
    .trim();

  return [
    "notes",
    "note",
    "lecture notes",
    "lecture note",
    "course notes",
    "course note",
    "study notes",
    "study note",
    "document",
    "untitled",
  ].includes(normalized);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

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
      include: {
        notes: {
          select: {
            id: true,
            title: true,
            content: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        studyTopics: {
          where: {
            deleted: true,
          },
          select: {
            name: true,
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

    if (course.notes.length === 0) {
      return NextResponse.json({
        topics: [],
        message: "No study materials uploaded yet.",
      });
    }

    const deletedTopics = new Set(
      course.studyTopics.map((topic) => topic.name.toLowerCase())
    );

    const topics: {
      id: string;
      name: string;
      sourceNoteId: string;
      sourceNoteTitle: string;
    }[] = [];

    const seen = new Set<string>();

    function addTopic(
      name: string,
      note: {
        id: string;
        title: string;
      }
    ) {
      const normalizedName = normalizeTopic(name);

      if (normalizedName.length < 3 || normalizedName.length > 100) {
        return;
      }

      const key = normalizedName.toLowerCase();

      if (seen.has(key) || deletedTopics.has(key)) {
        return;
      }

      seen.add(key);

      topics.push({
        id: `${note.id}-${topics.length}`,
        name: normalizedName,
        sourceNoteId: note.id,
        sourceNoteTitle: note.title,
      });
    }

    for (const note of course.notes) {
      if (!isGenericNoteTitle(note.title)) {
        addTopic(note.title, note);
      }

      const lines = note.content
        .split("\n")
        .map(cleanText)
        .filter(Boolean);

      for (const line of lines) {
        if (!looksLikeHeading(line)) {
          continue;
        }

        addTopic(line, note);
      }
    }

    return NextResponse.json({
      topics,
      course: {
        id: course.id,
        code: course.code,
        name: course.name,
      },
    });
  } catch (error) {
    console.error("Failed to generate study topics:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate study topics",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();

    const courseId = body.courseId;
    const topicName = body.topicName;

    if (!courseId || !topicName) {
      return NextResponse.json(
        { error: "Course ID and topic name are required" },
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
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    const normalizedName = normalizeTopic(topicName);

    await prisma.studyTopic.upsert({
      where: {
        courseId_name: {
          courseId,
          name: normalizedName,
        },
      },
      update: {
        deleted: true,
      },
      create: {
        courseId,
        name: normalizedName,
        deleted: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Topic deleted.",
    });
  } catch (error) {
    console.error("Failed to delete study topic:", error);

    return NextResponse.json(
      { error: "Failed to delete study topic." },
      { status: 500 }
    );
  }
}