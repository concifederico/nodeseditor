// Node connector types
export type ConnectorType = 'input' | 'output';
export type ConnectorValueType = 'energy' | 'air' | 'water' | 'number' | 'string' | 'boolean';
export type ConfigPropertyType = 'number' | 'string' | 'select' | 'boolean';
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

// Connector with properties
export interface ConnectorProperty {
  name: string;
  type: ConnectorValueType;
  unit?: string;
  required: boolean;
  defaultValue?: string | number | boolean;
}

export interface Connector {
  id: string;
  name: string;
  type: ConnectorType;
  valueType: ConnectorValueType;
  properties: ConnectorProperty[];
  position?: { x: number; y: number }; // Relative to node
}

// Node category
export type NodeCategory = string;

export interface ConfigPropertyOption {
  label: string;
  value: string | number | boolean;
}

export interface ConfigPropertyDefinition {
  name: string;
  label: string;
  type: ConfigPropertyType;
  unit?: string;
  defaultValue: string | number | boolean;
  options?: ConfigPropertyOption[];
}

// Node definition (template)
export interface NodeDefinition {
  id: string;
  slug?: string;
  name: string;
  category: NodeCategory;
  description: string;
  inputs: Connector[];
  outputs: Connector[];
  // Properties that are configurable fields within the node
  configProperties: ConfigPropertyDefinition[];
  defaultScript?: string;
  parameters?: JsonObject;
  icon?: string;
  width?: number;
  height?: number;
}

// Node instance on canvas
export interface NodeInstance {
  id: string;
  definitionId: string;
  name?: string;
  x: number;
  y: number;
  // Current configuration values
  config: Record<string, string | number | boolean>;
  // Connector values (state)
  connectorValues: Record<string, string | number | boolean>;
  scriptOverride?: string;
  output?: JsonValue;
  outputByConnector?: Record<string, JsonValue>;
  lastRunAt?: number;
  lastError?: string | null;
  // Resource utilization percentage (0-100)
  resourceUtilization?: number;
  // Custom node type
  customType?: string;
}

export interface OptimizationParameterChange {
  nodeId: string;
  paramName: string;
  value: string | number | boolean;
}

export type OptimizationMode =
  | 'max-throughput'
  | 'min-cycle-time'
  | 'balance-utilization'
  | 'custom-script';

export interface OptimizationResult {
  objective: OptimizationMode;
  objectiveLabel: string;
  objectiveValue: number;
  unit?: string;
  message?: string;
  bottleneckNodeIds?: string[];
  affectedNodeIds: string[];
  suggestedChanges: OptimizationParameterChange[];
  details?: Record<string, JsonValue>;
}

// Connection between nodes
export interface Connection {
  id: string;
  sourceNodeId: string;
  sourceConnectorId: string;
  targetNodeId: string;
  targetConnectorId: string;
  properties?: Record<string, string | number | boolean>;
}

// Canvas state
export interface CanvasState {
  id: string;
  name: string;
  description?: string;
  nodes: NodeInstance[];
  connections: Connection[];
  userId?: string;
  createdAt: number;
  updatedAt: number;
}

// UI State
export interface UIState {
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  isDragging: boolean;
  dragOffset: { x: number; y: number };
  zoom: number;
  panX: number;
  panY: number;
  draggedNodeDefId: string | null;
  optimizedNodeIds: string[];
}

export interface DiagramRecord {
  id: string;
  name: string;
  description?: string | null;
  nodes: NodeInstance[];
  connections: Connection[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserStats {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  lastLoginAt: string | null;
  totalSimulationMs: number;
  diagramCount: number;
}

export interface AdminActivityPoint {
  date: string;
  diagramsCreated: number;
  userRegistrations: number;
  logins: number;
}

export interface AdminUsersResponse {
  users: AdminUserStats[];
  activity: AdminActivityPoint[];
}
