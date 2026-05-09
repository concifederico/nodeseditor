import { NextResponse } from 'next/server';
import { ROLES } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/session';
import { AdminActivityPoint, AdminUsersResponse } from '@/types';

function subtractDays(baseDate: Date, days: number) {
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() - days);
  return nextDate;
}

function formatDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const authResult = await requireAdmin();

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const [users, activities] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { diagrams: true } },
        },
      }),
      prisma.userActivity.findMany({
        where: {
          createdAt: {
            gte: subtractDays(new Date(), 13),
          },
          type: {
            in: ['diagram_created', 'register', 'login'],
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const activityMap = new Map<string, AdminActivityPoint>();

    for (let index = 13; index >= 0; index -= 1) {
      const day = formatDay(subtractDays(new Date(), index));
      activityMap.set(day, {
        date: day,
        diagramsCreated: 0,
        userRegistrations: 0,
        logins: 0,
      });
    }

    for (const activity of activities) {
      const day = formatDay(activity.createdAt);
      const bucket = activityMap.get(day);

      if (!bucket) continue;

      if (activity.type === 'diagram_created') bucket.diagramsCreated += 1;
      if (activity.type === 'register') bucket.userRegistrations += 1;
      if (activity.type === 'login') bucket.logins += 1;
    }

    const payload: AdminUsersResponse = {
      users: users.map((user: (typeof users)[number]) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USER,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        totalSimulationMs: user.totalSimulationMs,
        diagramCount: user._count.diagrams,
      })),
      activity: [...activityMap.values()],
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('GET /api/admin/users error:', error);
    return NextResponse.json(
      { error: 'No se pudieron cargar las estadísticas.' },
      { status: 500 }
    );
  }
}
