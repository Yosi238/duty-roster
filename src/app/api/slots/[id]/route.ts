import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - get single slot with assignments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const slot = await prisma.dutySlot.findUnique({
      where: { id: params.id },
      include: {
        assignments: {
          include: { person: true },
        },
      },
    });

    if (!slot) {
      return NextResponse.json(
        { success: false, error: "Slot not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: slot });
  } catch (error) {
    console.error("Error fetching slot:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch slot" },
      { status: 500 }
    );
  }
}

// PUT - update slot
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { soldiersNeeded, commandersNeeded, officersNeeded, isLocked, notes } = body;

    const slot = await prisma.dutySlot.update({
      where: { id: params.id },
      data: {
        soldiersNeeded,
        commandersNeeded,
        officersNeeded,
        isLocked,
        notes,
      },
      include: {
        assignments: {
          include: { person: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: slot });
  } catch (error) {
    console.error("Error updating slot:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update slot" },
      { status: 500 }
    );
  }
}

// DELETE - delete slot
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.dutySlot.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting slot:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete slot" },
      { status: 500 }
    );
  }
}
