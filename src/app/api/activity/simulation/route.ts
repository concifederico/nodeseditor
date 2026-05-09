import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth/session';

export async function POST(request: Request) {
  const authResult = await requireSession();

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const body = (await request.json()) as { durationMs?: number; nodeCount?: number };
    const durationMs = Math.max(0, Math.min(Number(body.durationMs ?? 0), 60_000));
    const nodeCount = Math.max(0, Math.min(Number(body.nodeCount ?? 0), 10_000));

    await prisma.user.update({
      where: { id: authResult.session.user.id },
      data: {
        totalSimulationMs: {
          increment: durationMs,
        },
      },
    });

    await prisma.userActivity.create({
      data: {
        userId: authResult.session.user.id,
        type: 'simulation_run',
        metadata: { durationMs, nodeCount },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/activity/simulation error:', error);
    return NextResponse.json(
      { error: 'No se pudo registrar la simulación.' },
      { status: 500 }
    );
  }
}
