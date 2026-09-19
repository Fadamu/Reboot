import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

function cleanText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeSentence(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[•*-]\s*/, "")
    .trim();
}

function splitIntoChunks(content: string) {
  const cleaned = cleanText(content);

  const paragraphs = cleaned
    .split(/\n\s*\n/)
    .map(normalizeSentence)
    .filter(Boolean);

  const chunks: string[] = [];

  for (const paragraph of paragraphs) {
    const sentences = paragraph
      .split(/(?<=[.!?])\s+/)
      .map(normalizeSentence)
      .filter((sentence) => sentence.length >= 20);

    if (sentences.length === 0 && paragraph.length >= 20) {
      chunks.push(paragraph);
      continue;
    }

    for (const sentence of sentences) {
      chunks.push(sentence);
    }
  }

  return chunks;
}

function findAnswerWords(answer: string) {
  return answer
    .replace(/[.,!?():;]/g, "")
    .split(/\s+/)
    .filter((word) => /^[A-Za-z][A-Za-z-]{3,}$/.test(word))
    .filter(
      (word) =>
        ![
          "this",
          "that",
          "these",
          "those",
          "there",
          "their",
          "which",
          "where",
          "when",
          "with",
          "from",
          "into",
          "about",
          "also",
          "have",
          "has",
          "been",
          "were",
          "will",
          "would",
          "should",
          "because",
          "while",
        ].includes(word.toLowerCase())
    );
}

function createQuestion(
  chunk: string,
  index: number,
  topic: string
) {
  const answer = normalizeSentence(chunk);

  if (answer.length < 20) {
    return null;
  }

  const words = findAnswerWords(answer);

  if (words.length === 0) {
    return null;
  }

  const keyword = words[index % words.length];

  const question =
    `According to your uploaded study material for "${topic}", ` +
    `which statement is supported by the material about "${keyword}"?`;

  return {
    question,
    type: "MULTIPLE_CHOICE",
    options: JSON.stringify([
      answer,
      "This concept is not discussed in the uploaded material.",
      "The uploaded material gives the opposite explanation.",
      "The uploaded material does not connect this idea to the topic.",
    ]),
    answer,
    explanation:
      "The correct answer is taken directly from the uploaded study material.",
    source: answer.slice(0, 500),

    // This is what connects the quiz result
    // back to the Recovery Mission.
    topic,
  };
}

export async function POST(
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
        questions: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Study session not found." },
        { status: 404 }
      );
    }

    if (session.course.notes.length === 0) {
      return NextResponse.json(
        {
          error:
            "This course has no uploaded notes. Upload study material before generating a quiz.",
        },
        { status: 400 }
      );
    }

    if (session.questions.length > 0) {
      return NextResponse.json({
        message: "Quiz already exists for this study session.",
        questions: session.questions,
      });
    }

    const topicWords = session.topic
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.replace(/[^a-z0-9]/g, ""))
      .filter((word) => word.length >= 3);

    const rankedNotes = session.course.notes
      .map((note) => {
        const searchableText =
          `${note.title} ${note.content}`.toLowerCase();

        const relevanceScore = topicWords.reduce(
          (score, word) =>
            score +
            (searchableText.includes(word) ? 1 : 0),
          0
        );

        return {
          note,
          relevanceScore,
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    const bestScore = rankedNotes[0]?.relevanceScore ?? 0;

    const selectedNotes =
      bestScore > 0
        ? rankedNotes.filter(
            (item) => item.relevanceScore === bestScore
          )
        : rankedNotes;

    const generatedQuestions = selectedNotes
      .flatMap(({ note }) => {
        const chunks = splitIntoChunks(note.content);

        return chunks.map((chunk, index) =>
          createQuestion(chunk, index, session.topic)
        );
      })
      .filter(
        (
          question
        ): question is NonNullable<
          ReturnType<typeof createQuestion>
        > => question !== null
      )
      .slice(0, 5);

    if (generatedQuestions.length === 0) {
      return NextResponse.json(
        {
          error:
            "The uploaded material does not contain enough readable study content to create a quiz yet.",
        },
        { status: 400 }
      );
    }

    const questions = await prisma.$transaction(
      generatedQuestions.map((question) =>
        prisma.studyQuestion.create({
          data: {
            question: question.question,
            type: question.type,
            options: question.options,
            answer: question.answer,
            explanation: question.explanation,
            source: question.source,
            topic: question.topic,
            sessionId: session.id,
          },
        })
      )
    );

    return NextResponse.json({
      message: "Quiz generated successfully.",
      questions,
    });
  } catch (error) {
    console.error("Failed to generate study quiz:", error);

    return NextResponse.json(
      { error: "Failed to generate study quiz." },
      { status: 500 }
    );
  }
}
