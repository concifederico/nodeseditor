import {
  Connection,
  JsonValue,
  NodeDefinition,
  NodeInstance,
  OptimizationMode,
  OptimizationParameterChange,
  OptimizationResult,
} from '@/types';
import { buildOptimizationScript } from '@/lib/optimization/scripts';

type RunPythonFn = (
  script: string,
  inputs: Record<string, unknown>,
  options?: { config?: Record<string, unknown>; timeoutMs?: number }
) => Promise<unknown>;

export interface OptimizationFormValues {
  mode: OptimizationMode;
  selectedSinkId?: string;
  selectedCriticalNodeId?: string;
  wipLimit?: number | null;
  tolerance?: number;
  targetUtilization?: number;
  customScript?: string;
}

interface OptimizationPayloadNode {
  id: string;
  definitionId: string;
  name?: string;
  type: string;
  config: Record<string, string | number | boolean>;
  max_capacity: number;
  script: string;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function inferNodeCapacity(node: NodeInstance, definition?: NodeDefinition) {
  const candidates = [
    node.config.max_capacity,
    node.config.maxCapacity,
    node.config.capacity,
    node.config.service_rate,
  ];

  for (const value of candidates) {
    const numeric = toNumber(value);
    if (numeric !== null && numeric > 0) {
      return numeric;
    }
  }

  const maxCapacityProperty = definition?.configProperties.find((property) =>
    ['max_capacity', 'maxCapacity', 'capacity', 'service_rate'].includes(property.name)
  );
  const fallback = maxCapacityProperty ? toNumber(maxCapacityProperty.defaultValue) : null;

  return fallback && fallback > 0 ? fallback : 0;
}

function resolveNodeScript(node: NodeInstance, definition?: NodeDefinition) {
  return node.scriptOverride?.trim() || definition?.defaultScript?.trim() || 'result = inputs\n';
}

function normalizeEdges(connections: Connection[]) {
  return connections.map((connection) => ({
    id: connection.id,
    from: connection.sourceNodeId,
    to: connection.targetNodeId,
    sourceConnectorId: connection.sourceConnectorId,
    targetConnectorId: connection.targetConnectorId,
  }));
}

function normalizeChanges(value: unknown): OptimizationParameterChange[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const change = item as Record<string, unknown>;
      const nodeId = typeof change.nodeId === 'string' ? change.nodeId : null;
      const paramName = typeof change.paramName === 'string' ? change.paramName : null;
      const rawValue = change.value;

      if (!nodeId || !paramName) {
        return null;
      }

      if (
        typeof rawValue !== 'string' &&
        typeof rawValue !== 'number' &&
        typeof rawValue !== 'boolean'
      ) {
        return null;
      }

      return { nodeId, paramName, value: rawValue };
    })
    .filter((change): change is OptimizationParameterChange => Boolean(change));
}

function parseOptimizationResponse(
  raw: unknown,
  mode: OptimizationMode,
  label: string
): OptimizationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('La optimización no devolvió un resultado válido.');
  }

  const payload = raw as Record<string, unknown>;
  const objectiveValue = toNumber(payload.objective_value);

  if (objectiveValue === null) {
    throw new Error('El script de optimización no devolvió objective_value.');
  }

  const suggestedChanges = normalizeChanges(payload.optimal_parameters);
  const bottleneckNodeIds = Array.isArray(payload.bottleneck_node_ids)
    ? payload.bottleneck_node_ids.filter((value): value is string => typeof value === 'string')
    : [];
  const affectedNodeIds = Array.isArray(payload.affected_node_ids)
    ? payload.affected_node_ids.filter((value): value is string => typeof value === 'string')
    : [...new Set([...bottleneckNodeIds, ...suggestedChanges.map((change) => change.nodeId)])];

  return {
    objective: mode,
    objectiveLabel: label,
    objectiveValue,
    unit: typeof payload.unit === 'string' ? payload.unit : undefined,
    message: typeof payload.message === 'string' ? payload.message : undefined,
    bottleneckNodeIds,
    affectedNodeIds,
    suggestedChanges,
    details:
      payload.details && typeof payload.details === 'object' && !Array.isArray(payload.details)
        ? (payload.details as Record<string, JsonValue>)
        : undefined,
  };
}

function getObjectiveLabel(mode: OptimizationMode) {
  switch (mode) {
    case 'max-throughput':
      return 'Maximizar throughput';
    case 'min-cycle-time':
      return 'Minimizar tiempo de ciclo';
    case 'balance-utilization':
      return 'Balancear utilización';
    case 'custom-script':
      return 'Optimización personalizada';
  }
}

function getRuntimePackages(mode: OptimizationMode, customScript?: string) {
  const pyodidePackages = ['numpy'];
  const micropipPackages: string[] = [];

  if (mode === 'balance-utilization') {
    pyodidePackages.push('scipy');
  }

  if (mode === 'custom-script' && customScript) {
    if (/\bscipy\b/.test(customScript)) {
      pyodidePackages.push('scipy');
    }
    if (/\bortools\b/.test(customScript)) {
      micropipPackages.push('ortools');
    }
  }

  return {
    pyodidePackages: [...new Set(pyodidePackages)],
    micropipPackages: [...new Set(micropipPackages)],
  };
}

export async function runOptimization(params: {
  nodes: NodeInstance[];
  connections: Connection[];
  definitions: NodeDefinition[];
  values: OptimizationFormValues;
  runPython: RunPythonFn;
}) {
  const { nodes, connections, definitions, values, runPython } = params;

  if (nodes.length === 0) {
    throw new Error('El grafo no tiene nodos para optimizar.');
  }

  if (connections.length === 0) {
    throw new Error('El grafo no tiene conexiones. La optimización requiere al menos una arista.');
  }

  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const payloadNodes: OptimizationPayloadNode[] = nodes.map((node) => {
    const definition = definitionById.get(node.definitionId);
    const maxCapacity = inferNodeCapacity(node, definition);

    if (maxCapacity <= 0) {
      throw new Error(
        `El nodo ${node.name || node.id} no tiene max_capacity válido. Defínelo antes de optimizar.`
      );
    }

    return {
      id: node.id,
      definitionId: node.definitionId,
      name: node.name,
      type: node.customType || definition?.name || node.definitionId,
      config: node.config,
      max_capacity: maxCapacity,
      script: resolveNodeScript(node, definition),
    };
  });

  const sinkCandidates = payloadNodes.filter(
    (node) => !connections.some((connection) => connection.sourceNodeId === node.id)
  );

  const selectedSinkId =
    values.selectedSinkId ||
    sinkCandidates[0]?.id ||
    payloadNodes[payloadNodes.length - 1]?.id;

  const script = buildOptimizationScript(values.mode, values.customScript);
  const label = getObjectiveLabel(values.mode);
  const runtimePackages = getRuntimePackages(values.mode, values.customScript);

  const rawResult = await runPython(
    script,
    {
      nodes: payloadNodes,
      edges: normalizeEdges(connections),
      definitions,
      selectedSinkId,
      selectedCriticalNodeId: values.selectedCriticalNodeId || null,
      wipLimit: values.wipLimit ?? null,
      tolerance: values.tolerance ?? 0.1,
      targetUtilization: values.targetUtilization ?? 0.8,
    },
    {
      config: {
        __pyodidePackages__: runtimePackages.pyodidePackages,
        __micropipPackages__: runtimePackages.micropipPackages,
      },
      timeoutMs: values.mode === 'balance-utilization' || values.mode === 'custom-script' ? 15_000 : 10_000,
    }
  );

  return parseOptimizationResponse(rawResult, values.mode, label);
}
