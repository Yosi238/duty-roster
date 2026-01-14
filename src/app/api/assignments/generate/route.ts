import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateFullSchedule, DEFAULT_WEIGHTS } from "@/lib/algorithm";
import { Person, DutySlot, Assignment, AlgorithmWeights } from "@/types";

// POST - generate assignments for all unlocked slots
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slotIds, regenerate } = body; // Optional: specific slots to generate

    // Get algorithm weights from settings
    let weights: AlgorithmWeights = DEFAULT_WEIGHTS;
    const weightsSetting = await prisma.settings.findUnique({
      where: { key: "algorithmWeights" },
    });
    if (weightsSetting) {
      weights = JSON.parse(weightsSetting.value);
    }

    // Get all people with blocked dates
    const people = await prisma.person.findMany({
      where: { isActive: true },
      include: { blockedDates: true },
    }) as Person[];

    // Get slots to process
    let slotsWhere: Record<string, unknown> = {};
    if (slotIds && slotIds.length > 0) {
      slotsWhere = { id: { in: slotIds } };
    }

    const slots = await prisma.dutySlot.findMany({
      where: slotsWhere,
      orderBy: { date: "asc" },
    }) as DutySlot[];

    // Get all existing assignments
    const existingAssignments = await prisma.assignment.findMany({
      include: { person: true, slot: true },
    }) as Assignment[];

    // If regenerate is true, delete unlocked assignments first
    if (regenerate) {
      const deleteWhere: Record<string, unknown> = { isLocked: false };
      if (slotIds && slotIds.length > 0) {
        deleteWhere.slotId = { in: slotIds };
      }
      await prisma.assignment.deleteMany({ where: deleteWhere });
    }

    // Get locked assignments only (after potential deletion)
    const lockedAssignments = regenerate
      ? await prisma.assignment.findMany({
          where: { isLocked: true },
          include: { person: true, slot: true },
        })
      : existingAssignments;

    // Filter slots that need assignments
    const slotsToProcess = slots.filter((slot) => {
      if (slot.isLocked) return false;

      // Check if slot already has all needed assignments
      const slotAssignments = lockedAssignments.filter((a) => a.slotId === slot.id);

      const soldiers = slotAssignments.filter(
        (a) => a.role === "soldier" && !a.isReserve
      );
      const commanders = slotAssignments.filter(
        (a) => a.role === "commander" && !a.isReserve
      );
      const officers = slotAssignments.filter(
        (a) => a.role === "officer" && !a.isReserve
      );

      return (
        soldiers.length < slot.soldiersNeeded ||
        commanders.length < slot.commandersNeeded ||
        officers.length < slot.officersNeeded
      );
    });

    // Generate schedule
    const schedule = generateFullSchedule(
      slotsToProcess,
      people,
      lockedAssignments as Assignment[],
      weights
    );

    // Save new assignments to database
    const createdAssignments = [];
    const warnings: Array<{ slotId: string; message: string }> = [];

    for (const [slotId, results] of schedule) {
      for (const result of results) {
        if (!result.personId) {
          warnings.push({
            slotId,
            message: result.warnings.join(", "),
          });
          continue;
        }

        try {
          const assignment = await prisma.assignment.create({
            data: {
              slotId,
              personId: result.personId,
              role: result.role,
              isReserve: result.isReserve,
              isLocked: false,
              warnings:
                result.warnings.length > 0
                  ? JSON.stringify(result.warnings)
                  : null,
            },
            include: { person: true, slot: true },
          });
          createdAssignments.push(assignment);

          if (result.warnings.length > 0) {
            warnings.push({
              slotId,
              message: `${assignment.person?.name}: ${result.warnings.join(", ")}`,
            });
          }
        } catch (e) {
          // Duplicate, skip
          console.log("Skipping duplicate assignment");
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created: createdAssignments.length,
        warnings,
        processedSlots: slotsToProcess.length,
      },
    });
  } catch (error) {
    console.error("Error generating assignments:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate assignments" },
      { status: 500 }
    );
  }
}
