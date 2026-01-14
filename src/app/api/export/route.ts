import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { format } from "date-fns";

// GET - export data as JSON or CSV
export async function GET() {
  try {
    const [people, slots, assignments] = await Promise.all([
      prisma.person.findMany({
        include: { blockedDates: true },
        orderBy: { name: "asc" },
      }),
      prisma.dutySlot.findMany({
        orderBy: { date: "asc" },
      }),
      prisma.assignment.findMany({
        include: { person: true, slot: true },
        orderBy: { slot: { date: "asc" } },
      }),
    ]);

    const exportData = {
      exportDate: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      people,
      slots,
      assignments,
      summary: {
        totalPeople: people.length,
        activePeople: people.filter((p) => p.isActive).length,
        totalSlots: slots.length,
        totalAssignments: assignments.length,
      },
    };

    return NextResponse.json({ success: true, data: exportData });
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export data" },
      { status: 500 }
    );
  }
}
