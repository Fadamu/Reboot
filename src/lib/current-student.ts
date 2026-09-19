import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentStudent() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      student: true,
    },
  });

  return user?.student ?? null;
}