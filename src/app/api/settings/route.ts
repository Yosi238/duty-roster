import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - get all settings
export async function GET() {
  try {
    const settings = await prisma.settings.findMany();

    const settingsMap: Record<string, unknown> = {};
    for (const setting of settings) {
      try {
        settingsMap[setting.key] = JSON.parse(setting.value);
      } catch {
        settingsMap[setting.key] = setting.value;
      }
    }

    return NextResponse.json({ success: true, data: settingsMap });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT - update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      await prisma.settings.upsert({
        where: { key },
        create: {
          key,
          value: JSON.stringify(value),
        },
        update: {
          value: JSON.stringify(value),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
