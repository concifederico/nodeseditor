import { NextResponse } from 'next/server';
import { ROLES } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth/session';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSession();

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { id } = await context.params;

    const diagram = await prisma.diagram.findUnique({
      where: { id },
      select: { id: true, userId: true, name: true },
    });

    if (!diagram) {
      return NextResponse.json({ error: 'Diagrama no encontrado.' }, { status: 404 });
    }

    const canDelete =
      authResult.session.user.role === ROLES.ADMIN ||
      diagram.userId === authResult.session.user.id;

    if (!canDelete) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    await prisma.diagram.delete({ where: { id } });

    await prisma.userActivity.create({
      data: {
        userId: authResult.session.user.id,
        type: 'diagram_deleted',
        metadata: { diagramId: id, name: diagram.name },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/diagrams/[id] error:', error);
    return NextResponse.json(
      { error: 'No se pudo eliminar el diagrama.' },
      { status: 500 }
    );
  }
}
