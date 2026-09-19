import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/current-student";

type RouteContext = {
  params: Promise<{
    courseId: string;
  }>;
};

type TopicPerformance = {
  topic: string;
  questions: number;
  answered: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  status: "NOT_STARTED" | "NEEDS_WORK" | "IMPROVING" | "STRONG";
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { courseId } = await params;

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required." },
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
      include: {
        studySessions: {
          where: {
            deleted: false,
          },
          include: {
            questions: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
        studyTopics: {
          where: {
            deleted: false,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found." },
        { status: 404 }
      );
    }

    const latestResult = await prisma.result.findFirst({
      where: {
        courseId: course.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!latestResult || latestResult.grade !== "F") {
      return NextResponse.json(
        {
          error: "This course is not currently an active carryover.",
        },
        { status: 409 }
      );
    }

    const performanceMap = new Map<string, TopicPerformance>();

    for (const topic of course.studyTopics) {
      performanceMap.set(topic.name, {
        topic: topic.name,
        questions: 0,
        answered: 0,
        correct: 0,
        incorrect: 0,
        accuracy: 0,
        status: "NOT_STARTED",
      });
    }

    for (const session of course.studySessions) {
      for (const question of session.questions) {
        const topic =
          question.topic?.trim() ||
          session.topic.trim() ||
          "General";

        if (!performanceMap.has(topic)) {
          performanceMap.set(topic, {
            topic,
            questions: 0,
            answered: 0,
            correct: 0,
            incorrect: 0,
            accuracy: 0,
            status: "NOT_STARTED",
          });
        }

        const performance = performanceMap.get(topic)!;

        performance.questions += 1;

        if (question.userAnswer) {
          performance.answered += 1;

          if (question.isCorrect) {
            performance.correct += 1;
          } else {
            performance.incorrect += 1;
          }
        }
      }
    }

    const topics = Array.from(performanceMap.values()).map(
      (performance) => {
        if (performance.answered > 0) {
          performance.accuracy = Math.round(
            (performance.correct / performance.answered) * 100
          );
        }

        if (performance.answered === 0) {
          performance.status = "NOT_STARTED";
        } else if (performance.accuracy < 50) {
          performance.status = "NEEDS_WORK";
        } else if (performance.accuracy < 80) {
          performance.status = "IMPROVING";
        } else {
          performance.status = "STRONG";
        }

        return performance;
      }
    );

    topics.sort((a, b) => {
      if (a.status === "NEEDS_WORK" && b.status !== "NEEDS_WORK") {
        return -1;
      }

      if (a.status !== "NEEDS_WORK" && b.status === "NEEDS_WORK") {
        return 1;
      }

      return a.accuracy - b.accuracy;
    });

    const totalQuestions = topics.reduce(
      (sum, topic) => sum + topic.questions,
      0
    );

    const totalAnswered = topics.reduce(
      (sum, topic) => sum + topic.answered,
      0
    );

    const totalCorrect = topics.reduce(
      (sum, topic) => sum + topic.correct,
      0
    );

    const overallAccuracy =
      totalAnswered > 0
        ? Math.round((totalCorrect / totalAnswered) * 100)
        : 0;

    const weakTopics = topics.filter(
      (topic) => topic.status === "NEEDS_WORK"
    );

    return NextResponse.json({
      course: {
        id: course.id,
        code: course.code,
        name: course.name,
        units: course.units,
      },

      overall: {
        questions: totalQuestions,
        answered: totalAnswered,
        correct: totalCorrect,
        incorrect: totalAnswered - totalCorrect,
        accuracy: overallAccuracy,
      },

      weakTopics,

      topics,
    });
  } catch (error) {
    console.error(
      "Failed to calculate carryover performance:",
      error
    );

    return NextResponse.json(
      { error: "Failed to calculate carryover performance." },
      { status: 500 }
    );
  }
}