import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - get all people
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeBlocked = searchParams.get("includeBlocked") === "true";
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const people = await prisma.person.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: includeBlocked ? { blockedDates: true } : undefined,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: people });
  } catch (error) {
    console.error("Error fetching people:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch people" },
      { status: 500 }
    );
  }
}

// POST - create new person
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, isSoldier, isCommander, isOfficer, notes, blockedDates } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    const person = await prisma.person.create({
      data: {
        name: name.trim(),
        isSoldier: isSoldier ?? true,
        isCommander: isCommander ?? false,
        isOfficer: isOfficer ?? false,
        notes: notes || null,
        blockedDates: blockedDates
          ? {
              create: blockedDates.map((date: string) => ({ date })),
            }
          : undefined,
      },
      include: { blockedDates: true },
    });

    return NextResponse.json({ success: true, data: person });
  } catch (error) {
    console.error("Error creating person:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create person" },
      { status: 500 }
    );
  }
}
