import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth/session';
import { diagramToRecord } from '@/lib/diagrams';
import { diagramInputSchema } from '@/lib/validators';

export async function GET() {
  const authResult = await requireSession();

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const diagrams = await prisma.diagram.findMany({
      where: { userId: authResult.session.user.id },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(diagrams.map(diagramToRecord));
  } catch (error) {
    console.error('GET /api/diagrams error:', error);
    return NextResponse.json(
      { error: 'No se pudieron cargar los diagramas.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authResult = await requireSession();

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const body = await request.json();
    const parsed = diagramInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'El diagrama no es válido.' },
        { status: 400 }
      );
    }

    const data: Prisma.DiagramUncheckedCreateInput = {
      userId: authResult.session.user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      nodes: parsed.data.nodes as unknown as Prisma.InputJsonValue,
      connections: parsed.data.connections as unknown as Prisma.InputJsonValue,
    };

    let diagram;
    let activityType = 'diagram_created';

    if (parsed.data.id) {
      const existing = await prisma.diagram.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, userId: true },
      });

      if (existing && existing.userId !== authResult.session.user.id) {
        return NextResponse.json(
          { error: 'No puedes modificar este diagrama.' },
          { status: 403 }
        );
      }

      diagram = await prisma.diagram.upsert({
        where: { id: parsed.data.id },
        create: { ...data, id: parsed.data.id },
        update: {
          name: data.name,
          description: data.description,
          nodes: data.nodes,
          connections: data.connections,
        },
      });

      activityType = existing ? 'diagram_updated' : 'diagram_created';
    } else {
      diagram = await prisma.diagram.create({ data });
    }

    await prisma.userActivity.create({
      data: {
        userId: authResult.session.user.id,
        type: activityType,
        metadata: { diagramId: diagram.id, name: diagram.name },
      },
    });

    return NextResponse.json(diagramToRecord(diagram));
  } catch (error) {
    console.error('POST /api/diagrams error:', error);
    return NextResponse.json(
      { error: 'No se pudo guardar el diagrama.' },
      { status: 500 }
    );
  }
}
