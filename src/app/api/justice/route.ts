import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { JusticeStats, JusticeTableData, Role } from "@/types";

async function calculateJusticeStats(role: Role): Promise<{
  stats: JusticeStats[];
  avgDays: number;
  avgWeekends: number;
}> {
  // Get people with this role
  const roleFilter =
    role === "soldier"
      ? { isSoldier: true }
      : role === "commander"
      ? { isCommander: true }
      : { isOfficer: true };

  const people = await prisma.person.findMany({
    where: { isActive: true, ...roleFilter },
    include: {
      assignments: {
        include: { slot: true },
      },
    },
  });

  const stats: JusticeStats[] = [];
  let totalDays = 0;
  let totalWeekends = 0;

  for (const person of people) {
    const roleAssignments = person.assignments.filter((a) => a.role === role);

    let daysCount = 0;
    let weekendsCount = 0;
    let reserveDaysCount = 0;
    let reserveWeekendsCount = 0;
    let lastAssignedDate: string | null = null;

    for (const assignment of roleAssignments) {
      const isWeekend = assignment.slot.type === "weekend";

      if (assignment.isReserve) {
        if (isWeekend) {
          reserveWeekendsCount++;
        } else {
          reserveDaysCount++;
        }
      } else {
        if (isWeekend) {
          weekendsCount++;
        } else {
          daysCount++;
        }
      }

      if (
        !assignment.isReserve &&
        (!lastAssignedDate || assignment.slot.date > lastAssignedDate)
      ) {
        lastAssignedDate = assignment.slot.date;
      }
    }

    totalDays += daysCount;
    totalWeekends += weekendsCount;

    stats.push({
      personId: person.id,
      personName: person.name,
      role,
      daysCount,
      weekendsCount,
      reserveDaysCount,
      reserveWeekendsCount,
      lastAssignedDate,
      daysGapFromAvg: 0, // Will be calculated after
      weekendsGapFromAvg: 0, // Will be calculated after
    });
  }

  const avgDays = people.length > 0 ? totalDays / people.length : 0;
  const avgWeekends = people.length > 0 ? totalWeekends / people.length : 0;

  // Calculate gaps
  for (const stat of stats) {
    stat.daysGapFromAvg = stat.daysCount - avgDays;
    stat.weekendsGapFromAvg = stat.weekendsCount - avgWeekends;
  }

  // Sort by total assignments (descending)
  stats.sort(
    (a, b) =>
      b.daysCount + b.weekendsCount - (a.daysCount + a.weekendsCount)
  );

  return { stats, avgDays, avgWeekends };
}

// GET - get justice table data
export async function GET() {
  try {
    const [soldiers, commanders, officers] = await Promise.all([
      calculateJusticeStats("soldier"),
      calculateJusticeStats("commander"),
      calculateJusticeStats("officer"),
    ]);

    const data: JusticeTableData = {
      soldiers: soldiers.stats,
      commanders: commanders.stats,
      officers: officers.stats,
      averages: {
        soldiers: { days: soldiers.avgDays, weekends: soldiers.avgWeekends },
        commanders: { days: commanders.avgDays, weekends: commanders.avgWeekends },
        officers: { days: officers.avgDays, weekends: officers.avgWeekends },
      },
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error calculating justice stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to calculate justice stats" },
      { status: 500 }
    );
  }
}
