import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdminRole } from '@/lib/auth/roles';

export async function requireSession() {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'No autenticado.' }, { status: 401 }) };
  }

  return { session };
}

export async function requireAdmin() {
  const result = await requireSession();

  if ('error' in result) {
    return result;
  }

  if (!isAdminRole(result.session.user.role)) {
    return { error: NextResponse.json({ error: 'No autorizado.' }, { status: 403 }) };
  }

  return result;
}
