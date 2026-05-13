import { Connection, JsonValue, NodeDefinition, NodeInstance } from '@/types';

export interface GraphExecutionOrder {
  orderedNodeIds: string[];
  incomingByNodeId: Map<string, Connection[]>;
}

export function topologicalSortNodes(
  nodes: NodeInstance[],
  connections: Connection[]
): GraphExecutionOrder {
  const indegree = new Map<string, number>();
  const outgoing = new Map<string, Connection[]>();
  const incoming = new Map<string, Connection[]>();

  for (const node of nodes) {
    indegree.set(node.id, 0);
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  for (const connection of connections) {
    outgoing.get(connection.sourceNodeId)?.push(connection);
    incoming.get(connection.targetNodeId)?.push(connection);
    indegree.set(
      connection.targetNodeId,
      (indegree.get(connection.targetNodeId) ?? 0) + 1
    );
  }

  const queue = nodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  const orderedNodeIds: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift();

    if (!nodeId) continue;

    orderedNodeIds.push(nodeId);

    for (const connection of outgoing.get(nodeId) ?? []) {
      const nextValue = (indegree.get(connection.targetNodeId) ?? 0) - 1;
      indegree.set(connection.targetNodeId, nextValue);

      if (nextValue === 0) {
        queue.push(connection.targetNodeId);
      }
    }
  }

  if (orderedNodeIds.length !== nodes.length) {
    throw new Error('El grafo contiene ciclos. La simulación requiere un orden acíclico.');
  }

  return {
    orderedNodeIds,
    incomingByNodeId: incoming,
  };
}

export function resolveNodeScript(node: NodeInstance, definition?: NodeDefinition) {
  return node.scriptOverride?.trim() || definition?.defaultScript?.trim() || 'result = inputs\n';
}

export function normalizeNodeResult(
  rawOutput: unknown,
  definition?: NodeDefinition
): {
  output: JsonValue;
  outputByConnector: Record<string, JsonValue>;
} {
  if (
    rawOutput &&
    typeof rawOutput === 'object' &&
    !Array.isArray(rawOutput) &&
    'outputs' in rawOutput &&
    typeof rawOutput.outputs === 'object'
  ) {
    return {
      output: rawOutput as JsonValue,
      outputByConnector: rawOutput.outputs as Record<string, JsonValue>,
    };
  }

  const firstOutputId = definition?.outputs[0]?.id;
  return {
    output: rawOutput as JsonValue,
    outputByConnector: firstOutputId ? { [firstOutputId]: rawOutput as JsonValue } : {},
  };
}
