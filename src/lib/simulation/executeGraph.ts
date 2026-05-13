import { Connection, JsonValue, NodeDefinition, NodeInstance } from '@/types';
import { normalizeNodeResult, resolveNodeScript, topologicalSortNodes } from '@/lib/simulation/graph';

export interface GraphExecutionResult {
  nodeId: string;
  output: JsonValue;
  outputByConnector: Record<string, JsonValue>;
  utilization?: number;
}

function extractUtilization(rawOutput: unknown): number | undefined {
  if (rawOutput && typeof rawOutput === 'object' && !Array.isArray(rawOutput)) {
    const obj = rawOutput as Record<string, unknown>;
    if (typeof obj.utilization === 'number') {
      return Math.max(0, Math.min(100, obj.utilization));
    }
    if (typeof obj.outputs === 'object' && obj.outputs !== null) {
      const outputs = obj.outputs as Record<string, unknown>;
      if (typeof outputs.utilization === 'number') {
        return Math.max(0, Math.min(100, outputs.utilization));
      }
    }
  }
  return undefined;
}

function sanitizeConfigValue(
  value: unknown,
  propertyType: 'string' | 'number' | 'boolean' | 'select'
): unknown {
  if (propertyType === 'number') {
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (propertyType === 'boolean') {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true' || value === '1';
    return Boolean(value);
  }

  return String(value ?? '');
}

export async function executeGraphSequentially(params: {
  nodes: NodeInstance[];
  connections: Connection[];
  definitions: NodeDefinition[];
  runPythonScript: (
    script: string,
    inputs: Record<string, unknown>,
    options?: { config?: Record<string, unknown>; timeoutMs?: number }
  ) => Promise<unknown>;
  onNodeComplete?: (result: GraphExecutionResult) => void;
  onNodeUtilizationUpdate?: (nodeId: string, utilization: number) => void;
}) {
  const { orderedNodeIds, incomingByNodeId } = topologicalSortNodes(
    params.nodes,
    params.connections
  );
  const nodeById = new Map(params.nodes.map((node) => [node.id, node]));
  const definitionById = new Map(
    params.definitions.map((definition) => [definition.id, definition])
  );
  const results = new Map<string, GraphExecutionResult>();

  for (const nodeId of orderedNodeIds) {
    const node = nodeById.get(nodeId);

    if (!node) continue;

    const definition = definitionById.get(node.definitionId);
    const inputs: Record<string, unknown> = {};

    for (const connection of incomingByNodeId.get(nodeId) ?? []) {
      const upstream = results.get(connection.sourceNodeId);
      const connectedValue =
        upstream?.outputByConnector?.[connection.sourceConnectorId] ?? upstream?.output ?? null;

      inputs[connection.targetConnectorId] = connectedValue;
    }

    // Build complete config including all definition properties with their current or default values
    const config: Record<string, unknown> = {};
    if (definition) {
      for (const prop of definition.configProperties) {
        const value = node.config[prop.name] ?? prop.defaultValue;
        config[prop.name] = sanitizeConfigValue(value, prop.type);
      }
    } else {
      // If no definition, just pass existing config as-is
      Object.assign(config, node.config);
    }

    const rawOutput = await params.runPythonScript(
      resolveNodeScript(node, definition),
      inputs,
      {
        config: {
          ...config,
          __outputNames__: definition?.outputs.map((output) => output.id) ?? [],
        },
        timeoutMs: 4_000,
      }
    );

    const normalized = normalizeNodeResult(rawOutput, definition);
    const utilization = extractUtilization(rawOutput);
    const completedResult = {
      nodeId,
      output: normalized.output,
      outputByConnector: normalized.outputByConnector,
      ...(utilization !== undefined ? { utilization } : {}),
    };
    results.set(nodeId, completedResult);
    params.onNodeComplete?.(completedResult);
    if (utilization !== undefined) {
      params.onNodeUtilizationUpdate?.(nodeId, utilization);
    }
  }

  return orderedNodeIds.map((nodeId) => results.get(nodeId)).filter(Boolean) as GraphExecutionResult[];
}

