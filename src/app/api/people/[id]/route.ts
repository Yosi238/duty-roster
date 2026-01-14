import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - get single person
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const person = await prisma.person.findUnique({
      where: { id: params.id },
      include: { blockedDates: true, assignments: true },
    });

    if (!person) {
      return NextResponse.json(
        { success: false, error: "Person not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: person });
  } catch (error) {
    console.error("Error fetching person:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch person" },
      { status: 500 }
    );
  }
}

// PUT - update person
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, isSoldier, isCommander, isOfficer, isActive, notes, blockedDates } = body;

    // Delete existing blocked dates and recreate
    if (blockedDates !== undefined) {
      await prisma.blockedDate.deleteMany({
        where: { personId: params.id },
      });
    }

    const person = await prisma.person.update({
      where: { id: params.id },
      data: {
        name: name?.trim(),
        isSoldier,
        isCommander,
        isOfficer,
        isActive,
        notes,
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
    console.error("Error updating person:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update person" },
      { status: 500 }
    );
  }
}

// DELETE - delete person
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.person.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting person:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete person" },
      { status: 500 }
    );
  }
}
