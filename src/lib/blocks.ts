import type { Block, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { DEFAULT_NODE_DEFINITIONS } from '@/lib/nodes';
import { normalizeNodeDefinitions } from '@/lib/nodeDefinitionUtils';
import {
  JsonObject,
  JsonValue,
  NodeDefinition,
} from '@/types';

function defaultScriptForBlock(definition: NodeDefinition) {
  const firstOutput = definition.outputs[0]?.id ?? 'output';
  const firstInput = definition.inputs[0]?.id;

  return [
    '# inputs contiene los valores recibidos por conector.',
    '# config contiene las propiedades configuradas del nodo.',
    firstInput
      ? `result = inputs.get("${firstInput}") or {"connector": "${firstOutput}", "value": config}`
      : `result = {"connector": "${firstOutput}", "value": config}`,
    '',
  ].join('\n');
}

export function blockToNodeDefinition(block: Block): NodeDefinition {
  return {
    id: block.slug,
    slug: block.slug,
    name: block.name,
    category: block.category,
    description: block.description,
    inputs: block.inputs as unknown as NodeDefinition['inputs'],
    outputs: block.outputs as unknown as NodeDefinition['outputs'],
    configProperties:
      block.configProperties as unknown as NodeDefinition['configProperties'],
    defaultScript: block.defaultScript,
    parameters: (block.parameters as JsonObject | null) ?? undefined,
    icon: block.icon ?? undefined,
    width: block.width ?? undefined,
    height: block.height ?? undefined,
  };
}

export function nodeDefinitionToBlockInput(
  definition: NodeDefinition,
  createdById?: string
): Prisma.BlockUncheckedCreateInput {
  return {
    slug: definition.slug ?? definition.id,
    name: definition.name,
    category: definition.category,
    description: definition.description,
    inputs: definition.inputs as unknown as Prisma.InputJsonValue,
    outputs: definition.outputs as unknown as Prisma.InputJsonValue,
    configProperties: definition.configProperties as unknown as Prisma.InputJsonValue,
    defaultScript: definition.defaultScript || defaultScriptForBlock(definition),
    parameters: (definition.parameters ?? {}) as unknown as Prisma.InputJsonValue,
    icon: definition.icon,
    width: definition.width,
    height: definition.height,
    createdById,
  };
}

export async function ensureDefaultBlocks() {
  const blockCount = await prisma.block.count();

  if (blockCount > 0) {
    return;
  }

  const defaults = normalizeNodeDefinitions(Object.values(DEFAULT_NODE_DEFINITIONS)).map(
    (definition) => nodeDefinitionToBlockInput(definition)
  );

  await prisma.block.createMany({ data: defaults });
}

export async function listNodeDefinitions() {
  await ensureDefaultBlocks();

  const blocks = await prisma.block.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  return blocks.map(blockToNodeDefinition);
}

export function serializeValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        serializeValue(item),
      ])
    );
  }

  return String(value);
}
