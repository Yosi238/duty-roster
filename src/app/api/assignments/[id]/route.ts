import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PUT - update assignment (lock/unlock, swap)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { personId, isLocked, warnings } = body;

    const updateData: Record<string, unknown> = {};
    if (personId !== undefined) updateData.personId = personId;
    if (isLocked !== undefined) updateData.isLocked = isLocked;
    if (warnings !== undefined) updateData.warnings = JSON.stringify(warnings);

    const assignment = await prisma.assignment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        person: true,
        slot: true,
      },
    });

    return NextResponse.json({ success: true, data: assignment });
  } catch (error) {
    console.error("Error updating assignment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update assignment" },
      { status: 500 }
    );
  }
}

// DELETE - delete single assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.assignment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete assignment" },
      { status: 500 }
    );
  }
}
