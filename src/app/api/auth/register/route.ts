import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ROLES } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
});

const adminEmails = new Set(
  (process.env.AUTH_ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos de registro inválidos.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ese email ya está registrado.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: adminEmails.has(parsed.data.email) ? ROLES.ADMIN : ROLES.USER,
      },
      select: { id: true, email: true, role: true },
    });

    await prisma.userActivity.create({
      data: {
        userId: user.id,
        type: 'register',
        metadata: { email: user.email },
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('POST /api/auth/register error:', error);
    return NextResponse.json(
      { error: 'No se pudo crear el usuario.' },
      { status: 500 }
    );
  }
}
