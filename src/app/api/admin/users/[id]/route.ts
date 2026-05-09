import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/session';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { id } = await context.params;

    if (id === authResult.session.user.id) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propio usuario administrador.' },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });

    await prisma.userActivity.create({
      data: {
        userId: authResult.session.user.id,
        type: 'admin_deleted_user',
        metadata: { deletedUserId: id },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/users/[id] error:', error);
    return NextResponse.json(
      { error: 'No se pudo eliminar el usuario.' },
      { status: 500 }
    );
  }
}
