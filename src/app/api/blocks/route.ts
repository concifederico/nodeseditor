import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultBlocks, listNodeDefinitions, nodeDefinitionToBlockInput } from '@/lib/blocks';
import { requireAdmin, requireSession } from '@/lib/auth/session';
import { blockInputSchema } from '@/lib/validators';

export async function GET() {
  const authResult = await requireSession();

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const definitions = await listNodeDefinitions();
    return NextResponse.json(definitions);
  } catch (error) {
    console.error('GET /api/blocks error:', error);
    return NextResponse.json(
      { error: 'No se pudieron cargar los bloques.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authResult = await requireAdmin();

  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    await ensureDefaultBlocks();
    const body = await request.json();
    const parsed = blockInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'El bloque no es válido.' },
        { status: 400 }
      );
    }

    const payload = nodeDefinitionToBlockInput(
      {
        id: parsed.data.id ?? parsed.data.slug ?? parsed.data.name,
        slug: parsed.data.slug,
        name: parsed.data.name,
        category: parsed.data.category,
        description: parsed.data.description,
        inputs: parsed.data.inputs,
        outputs: parsed.data.outputs,
        configProperties: parsed.data.configProperties,
        defaultScript: parsed.data.defaultScript,
        parameters: parsed.data.parameters,
        icon: parsed.data.icon,
        width: parsed.data.width,
        height: parsed.data.height,
      },
      authResult.session.user.id
    );

    const existingById = parsed.data.id
      ? await prisma.block.findUnique({ where: { id: parsed.data.id } })
      : null;

    const block = existingById
      ? await prisma.block.update({
          where: { id: existingById.id },
          data: {
            ...payload,
            createdById: authResult.session.user.id,
          },
        })
      : await prisma.block.upsert({
          where: { slug: payload.slug },
          create: payload,
          update: {
            name: payload.name,
            category: payload.category,
            description: payload.description,
            inputs: payload.inputs,
            outputs: payload.outputs,
            configProperties: payload.configProperties,
            defaultScript: payload.defaultScript,
            parameters: payload.parameters,
            icon: payload.icon,
            width: payload.width,
            height: payload.height,
            createdById: authResult.session.user.id,
          },
        });

    await prisma.userActivity.create({
      data: {
        userId: authResult.session.user.id,
        type: 'block_saved',
        metadata: { blockId: block.id, slug: block.slug },
      },
    });

    const definitions = await listNodeDefinitions();
    return NextResponse.json(definitions);
  } catch (error) {
    console.error('POST /api/blocks error:', error);
    return NextResponse.json(
      { error: 'No se pudo guardar el bloque.' },
      { status: 500 }
    );
  }
}
