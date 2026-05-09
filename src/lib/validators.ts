import { z } from 'zod';
import { MAX_NODE_SCRIPT_LENGTH } from '@/lib/constants';

const scalarValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const configPropertySchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['number', 'string', 'select', 'boolean']),
  unit: z.string().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]),
  options: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.union([z.string(), z.number(), z.boolean()]),
      })
    )
    .optional(),
});

const connectorPropertySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['energy', 'air', 'water', 'number', 'string', 'boolean']),
  unit: z.string().optional(),
  required: z.boolean(),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

const connectorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['input', 'output']),
  valueType: z.enum(['energy', 'air', 'water', 'number', 'string', 'boolean']),
  properties: z.array(connectorPropertySchema),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});

const nodeInstanceSchema = z.object({
  id: z.string().min(1),
  definitionId: z.string().min(1),
  name: z.string().optional(),
  x: z.number(),
  y: z.number(),
  config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  connectorValues: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  scriptOverride: z.string().max(MAX_NODE_SCRIPT_LENGTH).optional(),
  output: z.unknown().optional(),
  outputByConnector: z.record(z.string(), z.unknown()).optional(),
  lastRunAt: z.number().optional(),
  lastError: z.string().nullable().optional(),
  resourceUtilization: z.number().optional(),
  customType: z.string().optional(),
});

const connectionSchema = z.object({
  id: z.string().min(1),
  sourceNodeId: z.string().min(1),
  sourceConnectorId: z.string().min(1),
  targetNodeId: z.string().min(1),
  targetConnectorId: z.string().min(1),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const diagramInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  nodes: z.array(nodeInstanceSchema),
  connections: z.array(connectionSchema),
});

export const blockInputSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500),
  inputs: z.array(connectorSchema),
  outputs: z.array(connectorSchema),
  configProperties: z.array(configPropertySchema),
  defaultScript: z.string().max(MAX_NODE_SCRIPT_LENGTH).default(''),
  parameters: z.record(z.string(), scalarValueSchema).optional(),
  icon: z.string().optional(),
  width: z.number().min(80).max(400).optional(),
  height: z.number().min(60).max(400).optional(),
});
