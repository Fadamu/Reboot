import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Study session ID is required." },
        { status: 400 }
      );
    }

    const session = await prisma.studySession.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        course: {
          include: {
            notes: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
        questions: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Study session not found." },
        { status: 404 }
      );
    }

    const topicWords = session.topic
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.replace(/[^a-z0-9]/g, ""))
      .filter((word) => word.length >= 3);

    const scoredNotes = session.course.notes
      .map((note) => {
        const searchableText =
          `${note.title} ${note.content}`.toLowerCase();

        const score = topicWords.reduce((total, word) => {
          return total + (searchableText.includes(word) ? 1 : 0);
        }, 0);

        return {
          note,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);

    const matchingNotes = scoredNotes.filter((item) => item.score > 0);

    const selectedNotes =
      matchingNotes.length > 0
        ? matchingNotes
        : scoredNotes;

    return NextResponse.json({
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
      notes: selectedNotes.map(({ note, score }) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        fileName: note.fileName,
        fileType: note.fileType,
        relevanceScore: score,
      })),
      questions: session.questions.map((question) => ({
        id: question.id,
        question: question.question,
        type: question.type,
        options: question.options,
        answer: question.answer,
        explanation: question.explanation,
        source: question.source,
        topic: question.topic,
        userAnswer: question.userAnswer,
        isCorrect: question.isCorrect,
      })),
    });
  } catch (error) {
    console.error("Failed to load study session:", error);

    return NextResponse.json(
      { error: "Failed to load study session." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Study session ID is required." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const completed =
      typeof body.completed === "boolean"
        ? body.completed
        : undefined;

    if (completed === undefined) {
      return NextResponse.json(
        { error: "A completed value is required." },
        { status: 400 }
      );
    }

    const session = await prisma.studySession.update({
      where: {
        id: sessionId,
      },
      data: {
        completed,
      },
      include: {
        course: true,
      },
    });

    return NextResponse.json({
      message: "Study session updated successfully.",
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
    });
  } catch (error) {
    console.error("Failed to update study session:", error);

    return NextResponse.json(
      { error: "Failed to update study session." },
      { status: 500 }
    );
  }
}