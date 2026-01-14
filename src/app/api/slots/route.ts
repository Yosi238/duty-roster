import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - get all duty slots
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get("month"); // YYYY-MM format
    const includeAssignments = searchParams.get("includeAssignments") === "true";

    let whereClause = {};
    if (month) {
      whereClause = {
        date: {
          startsWith: month,
        },
      };
    }

    const slots = await prisma.dutySlot.findMany({
      where: whereClause,
      include: includeAssignments
        ? {
            assignments: {
              include: { person: true },
            },
          }
        : undefined,
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ success: true, data: slots });
  } catch (error) {
    console.error("Error fetching slots:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch slots" },
      { status: 500 }
    );
  }
}

// POST - create new duty slot(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slots } = body; // Array of slots or single slot

    const slotsArray = Array.isArray(slots) ? slots : [body];
    const created = [];
    const skipped = [];

    for (const slotData of slotsArray) {
      const { date, type, soldiersNeeded, commandersNeeded, officersNeeded, notes } = slotData;

      if (!date || !type) {
        skipped.push({ date, reason: "Missing date or type" });
        continue;
      }

      // Check for duplicates
      const existing = await prisma.dutySlot.findUnique({
        where: { date_type: { date, type } },
      });

      if (existing) {
        skipped.push({ date, reason: "Already exists" });
        continue;
      }

      const slot = await prisma.dutySlot.create({
        data: {
          date,
          type,
          soldiersNeeded: soldiersNeeded ?? 1,
          commandersNeeded: commandersNeeded ?? 1,
          officersNeeded: officersNeeded ?? 1,
          notes: notes || null,
        },
      });

      created.push(slot);
    }

    return NextResponse.json({
      success: true,
      data: { created, skipped },
    });
  } catch (error) {
    console.error("Error creating slot:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create slot" },
      { status: 500 }
    );
  }
}
