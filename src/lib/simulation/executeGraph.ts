import { Connection, NodeDefinition, NodeInstance } from '@/types';
import { normalizeNodeResult, resolveNodeScript, topologicalSortNodes } from '@/lib/simulation/graph';

export interface GraphExecutionResult {
  nodeId: string;
  output: unknown;
  outputByConnector: Record<string, unknown>;
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

    const rawOutput = await params.runPythonScript(
      resolveNodeScript(node, definition),
      inputs,
      {
        config: node.config,
        timeoutMs: 4_000,
      }
    );

    const normalized = normalizeNodeResult(rawOutput, definition);
    const completedResult = {
      nodeId,
      output: normalized.output,
      outputByConnector: normalized.outputByConnector,
    };
    results.set(nodeId, completedResult);
    params.onNodeComplete?.(completedResult);
  }

  return orderedNodeIds.map((nodeId) => results.get(nodeId)).filter(Boolean) as GraphExecutionResult[];
}
