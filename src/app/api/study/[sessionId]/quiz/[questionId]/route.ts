import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    sessionId: string;
    questionId: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { sessionId, questionId } = await params;

    if (!sessionId || !questionId) {
      return NextResponse.json(
        { error: "Session ID and question ID are required." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const userAnswer = String(body.userAnswer ?? "").trim();

    if (!userAnswer) {
      return NextResponse.json(
        { error: "An answer is required." },
        { status: 400 }
      );
    }

    const question = await prisma.studyQuestion.findFirst({
      where: {
        id: questionId,
        sessionId,
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found." },
        { status: 404 }
      );
    }

    const isCorrect = userAnswer === question.answer;

    const updatedQuestion = await prisma.studyQuestion.update({
      where: {
        id: question.id,
      },
      data: {
        userAnswer,
        isCorrect,
      },
    });

    return NextResponse.json({
      message: "Answer saved successfully.",
      question: {
        id: updatedQuestion.id,
        question: updatedQuestion.question,
        topic: updatedQuestion.topic,
        userAnswer: updatedQuestion.userAnswer,
        isCorrect: updatedQuestion.isCorrect,
        answer: updatedQuestion.answer,
        explanation: updatedQuestion.explanation,
      },
    });
  } catch (error) {
    console.error("Failed to save quiz answer:", error);

    return NextResponse.json(
      { error: "Failed to save quiz answer." },
      { status: 500 }
    );
  }
}