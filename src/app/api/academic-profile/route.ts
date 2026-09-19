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

    const profile = await prisma.academicProfile.findUnique({
      where: {
        studentId: student.id,
      },
    });

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
      },
      profile,
    });
  } catch (error) {
    console.error("Failed to load academic profile:", error);

    return NextResponse.json(
      { error: "Failed to load academic profile." },
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

    const school = String(body.school ?? "").trim();
    const department = String(body.department ?? "").trim();
    const program = String(body.program ?? "").trim();
    const programDurationYears = Number(body.programDurationYears);
    const startYear = Number(body.startYear);

    if (!school || !department || !program) {
      return NextResponse.json(
        {
          error: "School, department, and program are required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(programDurationYears) ||
      programDurationYears < 1 ||
      programDurationYears > 10
    ) {
      return NextResponse.json(
        {
          error:
            "Program duration must be a whole number between 1 and 10 years.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(startYear) ||
      startYear < 2000 ||
      startYear > 2100
    ) {
      return NextResponse.json(
        {
          error: "Please enter a valid start year.",
        },
        { status: 400 }
      );
    }

    const profile = await prisma.academicProfile.upsert({
      where: {
        studentId: student.id,
      },
      update: {
        school,
        department,
        program,
        programDurationYears,
        startYear,
      },
      create: {
        studentId: student.id,
        school,
        department,
        program,
        programDurationYears,
        startYear,
      },
    });

    return NextResponse.json(
      {
        message: "Academic profile saved successfully.",
        profile,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to save academic profile:", error);

    return NextResponse.json(
      { error: "Failed to save academic profile." },
      { status: 500 }
    );
  }
}