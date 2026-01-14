import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - get all assignments
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const slotId = searchParams.get("slotId");
    const personId = searchParams.get("personId");

    const whereClause: Record<string, string> = {};
    if (slotId) whereClause.slotId = slotId;
    if (personId) whereClause.personId = personId;

    const assignments = await prisma.assignment.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        person: true,
        slot: true,
      },
      orderBy: { slot: { date: "asc" } },
    });

    return NextResponse.json({ success: true, data: assignments });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

// POST - create assignment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slotId, personId, role, isReserve, warnings } = body;

    if (!slotId || !personId || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if person is already assigned to this slot in this role
    const existing = await prisma.assignment.findFirst({
      where: {
        slotId,
        personId,
        role,
        isReserve: isReserve ?? false,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Assignment already exists" },
        { status: 400 }
      );
    }

    const assignment = await prisma.assignment.create({
      data: {
        slotId,
        personId,
        role,
        isReserve: isReserve ?? false,
        warnings: warnings ? JSON.stringify(warnings) : null,
      },
      include: {
        person: true,
        slot: true,
      },
    });

    return NextResponse.json({ success: true, data: assignment });
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create assignment" },
      { status: 500 }
    );
  }
}

// DELETE - bulk delete assignments for a slot
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const slotId = searchParams.get("slotId");
    const role = searchParams.get("role");
    const isReserve = searchParams.get("isReserve");
    const unlockedOnly = searchParams.get("unlockedOnly") === "true";

    const whereClause: Record<string, unknown> = {};
    if (slotId) whereClause.slotId = slotId;
    if (role) whereClause.role = role;
    if (isReserve !== null) whereClause.isReserve = isReserve === "true";
    if (unlockedOnly) whereClause.isLocked = false;

    const result = await prisma.assignment.deleteMany({
      where: whereClause,
    });

    return NextResponse.json({ success: true, data: { count: result.count } });
  } catch (error) {
    console.error("Error deleting assignments:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete assignments" },
      { status: 500 }
    );
  }
}
