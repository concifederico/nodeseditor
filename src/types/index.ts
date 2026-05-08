// Node connector types
export type ConnectorType = 'input' | 'output';
export type ConnectorValueType = 'energy' | 'air' | 'water' | 'number' | 'string' | 'boolean';
export type ConfigPropertyType = 'number' | 'string' | 'select' | 'boolean';

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
  name: string;
  category: NodeCategory;
  description: string;
  inputs: Connector[];
  outputs: Connector[];
  // Properties that are configurable fields within the node
  configProperties: ConfigPropertyDefinition[];
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
  // Resource utilization percentage (0-100)
  resourceUtilization?: number;
  // Custom node type
  customType?: string;
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
}
