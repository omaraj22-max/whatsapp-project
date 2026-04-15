import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const workflows = await prisma.workflow.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(workflows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, trigger, conditions, actions } = await request.json();
    const workflow = await prisma.workflow.create({
      data: { name, description, trigger, conditions, actions },
    });
    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear workflow" }, { status: 500 });
  }
}
