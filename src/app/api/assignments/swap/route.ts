import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST - swap two assignments
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignment1Id, assignment2Id } = body;

    if (!assignment1Id || !assignment2Id) {
      return NextResponse.json(
        { success: false, error: "Both assignment IDs are required" },
        { status: 400 }
      );
    }

    // Get both assignments
    const [assignment1, assignment2] = await Promise.all([
      prisma.assignment.findUnique({ where: { id: assignment1Id } }),
      prisma.assignment.findUnique({ where: { id: assignment2Id } }),
    ]);

    if (!assignment1 || !assignment2) {
      return NextResponse.json(
        { success: false, error: "One or both assignments not found" },
        { status: 404 }
      );
    }

    // Validate swap conditions
    if (assignment1.role !== assignment2.role) {
      return NextResponse.json(
        { success: false, error: "Cannot swap different roles" },
        { status: 400 }
      );
    }

    if (assignment1.isReserve !== assignment2.isReserve) {
      return NextResponse.json(
        { success: false, error: "Cannot swap main and reserve" },
        { status: 400 }
      );
    }

    if (assignment1.isLocked || assignment2.isLocked) {
      return NextResponse.json(
        { success: false, error: "Cannot swap locked assignments" },
        { status: 400 }
      );
    }

    // Perform swap
    await prisma.$transaction([
      prisma.assignment.update({
        where: { id: assignment1Id },
        data: { personId: assignment2.personId },
      }),
      prisma.assignment.update({
        where: { id: assignment2Id },
        data: { personId: assignment1.personId },
      }),
    ]);

    // Get updated assignments
    const [updated1, updated2] = await Promise.all([
      prisma.assignment.findUnique({
        where: { id: assignment1Id },
        include: { person: true, slot: true },
      }),
      prisma.assignment.findUnique({
        where: { id: assignment2Id },
        include: { person: true, slot: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { assignment1: updated1, assignment2: updated2 },
    });
  } catch (error) {
    console.error("Error swapping assignments:", error);
    return NextResponse.json(
      { success: false, error: "Failed to swap assignments" },
      { status: 500 }
    );
  }
}
