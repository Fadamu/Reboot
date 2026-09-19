import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractText } from "unpdf";
import { parseOffice } from "officeparser";
import { getCurrentStudent } from "@/lib/current-student";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

function getFileTypeName(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "PDF";
    case "docx":
      return "Word document";
    case "pptx":
      return "PowerPoint presentation";
    case "txt":
      return "text file";
    default:
      return "file";
  }
}

async function extractUploadedText(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "txt" || file.type === "text/plain") {
    return (await file.text()).trim();
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (extension === "pdf" || file.type === "application/pdf") {
    const { text } = await extractText(new Uint8Array(buffer));
    return text.join("\n").trim();
  }

  if (extension === "docx" || extension === "pptx") {
    const parsed = await parseOffice(buffer);
    const result = await parsed.to("text");

    if (typeof result.value !== "string") {
      throw new Error("Office document text extraction did not return text.");
    }

    return result.value.trim();
  }

  throw new Error("Unsupported file type.");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const courseId = formData.get("courseId");
    const title = formData.get("title");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Please upload a PDF, Word document, PowerPoint presentation, or text file.",
        },
        { status: 400 }
      );
    }

    if (typeof courseId !== "string" || !courseId) {
      return NextResponse.json(
        { error: "A course is required." },
        { status: 400 }
      );
    }

    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "A note title is required." },
        { status: 400 }
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    const allowedExtensions = new Set([
      "pdf",
      "docx",
      "pptx",
      "txt",
    ]);

    if (!extension || !allowedExtensions.has(extension)) {
      return NextResponse.json(
        {
          error:
            "Only PDF, Word (.docx), PowerPoint (.pptx), and text (.txt) files are supported.",
        },
        { status: 400 }
      );
    }

    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      const extensionTypeAllowed =
        extension === "pdf" ||
        extension === "docx" ||
        extension === "pptx" ||
        extension === "txt";

      if (!extensionTypeAllowed) {
        return NextResponse.json(
          {
            error:
              "Only PDF, Word (.docx), PowerPoint (.pptx), and text (.txt) files are supported.",
          },
          { status: 400 }
        );
      }
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `${getFileTypeName(file)} must be 10MB or smaller.`,
        },
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
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found." },
        { status: 404 }
      );
    }

    const extractedText = await extractUploadedText(file);

    if (!extractedText) {
      return NextResponse.json(
        {
          error:
            `REBOOT could not extract readable text from this ${getFileTypeName(file)}. ` +
            "If the file contains scanned images or screenshots instead of selectable text, " +
            "REBOOT may not be able to read them yet.",
        },
        { status: 400 }
      );
    }

    const note = await prisma.note.create({
      data: {
        title: title.trim(),
        content: extractedText,
        fileName: file.name,
        fileType: file.type || extension,
        courseId: course.id,
      },
      include: {
        course: true,
      },
    });

    return NextResponse.json(
      {
        message: `${getFileTypeName(file)} uploaded and processed successfully.`,
        note: {
          id: note.id,
          title: note.title,
          content: note.content,
          fileName: note.fileName,
          fileType: note.fileType,
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
    console.error("File upload error:", error);

    return NextResponse.json(
      {
        error:
          "Failed to process the uploaded file. Please make sure it is a valid PDF, Word, PowerPoint, or text file.",
      },
      { status: 500 }
    );
  }
}