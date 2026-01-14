import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST - verify admin password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    const adminPassword = await prisma.settings.findUnique({
      where: { key: "adminPassword" },
    });

    if (!adminPassword) {
      // Default password if not set
      const isValid = password === "admin123";
      return NextResponse.json({ success: true, data: { valid: isValid } });
    }

    const storedPassword = JSON.parse(adminPassword.value);
    const isValid = password === storedPassword;

    return NextResponse.json({ success: true, data: { valid: isValid } });
  } catch (error) {
    console.error("Error verifying password:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify password" },
      { status: 500 }
    );
  }
}
