'use client';

import { create } from 'zustand';
import {
  CanvasState,
  NodeInstance,
  UIState,
  NodeDefinition,
  OptimizationParameterChange,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getNodeDefinition } from '../nodes';

type NodeConfig = NodeInstance['config'];
type NodeExecutionResult = {
  output?: NodeInstance['output'];
  outputByConnector?: NonNullable<NodeInstance['outputByConnector']>;
};

interface CanvasStore {
  // Canvas state
  canvas: CanvasState;
  
  // UI state
  ui: UIState;
  
  // Node definitions (library)
  nodeDefinitions: NodeDefinition[];

  // Canvas actions
  setCanvasName: (name: string) => void;
  setCanvasDescription: (description: string) => void;
  
  // Node library actions
  setNodeDefinitions: (definitions: NodeDefinition[]) => void;
  setDraggedNodeDef: (definitionId: string | null) => void;
  
  // Node actions
  addNode: (definitionId: string, x: number, y: number) => string;
  removeNode: (nodeId: string) => void;
  updateNodePosition: (nodeId: string, x: number, y: number) => void;
  updateNodeName: (nodeId: string, name: string) => void;
  updateNodeConfig: (nodeId: string, config: NodeConfig) => void;
  updateNodeResourceUtilization: (nodeId: string, utilization: number) => void;
  updateNodeCustomType: (nodeId: string, customType: string) => void;
  applyNodeParameterChanges: (changes: OptimizationParameterChange[]) => void;
  
  // Connection actions
  addConnection: (
    sourceNodeId: string,
    sourceConnectorId: string,
    targetNodeId: string,
    targetConnectorId: string
  ) => string | null;
  removeConnection: (connectionId: string) => void;
  
  // UI actions
  selectNode: (nodeId: string | null) => void;
  selectConnection: (connectionId: string | null) => void;
  setDragging: (isDragging: boolean) => void;
  setDragOffset: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setOptimizedNodeIds: (nodeIds: string[]) => void;
  
  // Canvas operations
  clearCanvas: () => void;
  loadCanvas: (canvas: CanvasState) => void;
  
  // Simulation actions
  updateNodeExecutionResult: (nodeId: string, result: NodeExecutionResult) => void;
  clearSimulationResults: () => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  canvas: {
    id: uuidv4(),
    name: 'Nuevo Proyecto',
    nodes: [],
    connections: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },

  ui: {
    selectedNodeId: null,
    selectedConnectionId: null,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    zoom: 1,
    panX: 0,
    panY: 0,
    draggedNodeDefId: null,
    optimizedNodeIds: [],
  },

  nodeDefinitions: [],

  setCanvasName: (name: string) =>
    set((state) => ({
      canvas: { ...state.canvas, name, updatedAt: Date.now() },
    })),

  setCanvasDescription: (description: string) =>
    set((state) => ({
      canvas: { ...state.canvas, description, updatedAt: Date.now() },
    })),

  setNodeDefinitions: (definitions: NodeDefinition[]) =>
    set({
      nodeDefinitions: definitions,
    }),

  setDraggedNodeDef: (definitionId: string | null) =>
    set((state) => ({
      ui: { ...state.ui, draggedNodeDefId: definitionId },
    })),

  addNode: (definitionId: string, x: number, y: number) => {
    const nodeId = uuidv4();
    const definition =
      get().nodeDefinitions.find((nodeDefinition) => nodeDefinition.id === definitionId) ??
      getNodeDefinition(definitionId);
    
    if (!definition) {
      console.error(`Node definition not found: ${definitionId}`);
      return nodeId;
    }

    // Create default config from definition
    const config: NodeConfig = {};
    definition.configProperties.forEach((prop) => {
      config[prop.name] = prop.defaultValue;
    });

    const newNode: NodeInstance = {
      id: nodeId,
      definitionId,
      x,
      y,
      config,
      connectorValues: {},
    };

    set((state) => ({
      canvas: {
        ...state.canvas,
        nodes: [...state.canvas.nodes, newNode],
        updatedAt: Date.now(),
      },
    }));

    return nodeId;
  },

  removeNode: (nodeId: string) =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        nodes: state.canvas.nodes.filter((n) => n.id !== nodeId),
        connections: state.canvas.connections.filter(
          (c) => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
        ),
        updatedAt: Date.now(),
      },
    })),

  updateNodePosition: (nodeId: string, x: number, y: number) =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        nodes: state.canvas.nodes.map((n) =>
          n.id === nodeId ? { ...n, x, y } : n
        ),
        updatedAt: Date.now(),
      },
    })),

  updateNodeName: (nodeId: string, name: string) =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        nodes: state.canvas.nodes.map((n) => (n.id === nodeId ? { ...n, name } : n)),
        updatedAt: Date.now(),
      },
    })),

  updateNodeConfig: (nodeId: string, config: NodeConfig) =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        nodes: state.canvas.nodes.map((n) =>
          n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n
        ),
        updatedAt: Date.now(),
      },
    })),

  updateNodeResourceUtilization: (nodeId: string, utilization: number) =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        nodes: state.canvas.nodes.map((n) =>
          n.id === nodeId ? { ...n, resourceUtilization: utilization } : n
        ),
        updatedAt: Date.now(),
      },
    })),

  updateNodeCustomType: (nodeId: string, customType: string) =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        nodes: state.canvas.nodes.map((n) => (n.id === nodeId ? { ...n, customType } : n)),
        updatedAt: Date.now(),
      },
    })),

  applyNodeParameterChanges: (changes: OptimizationParameterChange[]) =>
    set((state) => {
      if (changes.length === 0) {
        return state;
      }

      const changesByNodeId = new Map<string, OptimizationParameterChange[]>();
      for (const change of changes) {
        const existing = changesByNodeId.get(change.nodeId) ?? [];
        existing.push(change);
        changesByNodeId.set(change.nodeId, existing);
      }

      return {
        canvas: {
          ...state.canvas,
          nodes: state.canvas.nodes.map((node) => {
            const nodeChanges = changesByNodeId.get(node.id);
            if (!nodeChanges) {
              return node;
            }

            const nextConfig = { ...node.config };
            for (const change of nodeChanges) {
              nextConfig[change.paramName] = change.value;
            }

            return {
              ...node,
              config: nextConfig,
            };
          }),
          updatedAt: Date.now(),
        },
      };
    }),

  addConnection: (
    sourceNodeId: string,
    sourceConnectorId: string,
    targetNodeId: string,
    targetConnectorId: string
  ) => {
    const connectionId = uuidv4();
    const state = get();
    
    // Validation: check if nodes exist
    const sourceNode = state.canvas.nodes.find((n) => n.id === sourceNodeId);
    const targetNode = state.canvas.nodes.find((n) => n.id === targetNodeId);
    
    if (!sourceNode || !targetNode) {
      console.error('Invalid nodes for connection');
      return null;
    }

    // Prevent duplicate connections between same connectors
    const exists = state.canvas.connections.some(
      (c) =>
        c.sourceNodeId === sourceNodeId &&
        c.sourceConnectorId === sourceConnectorId &&
        c.targetNodeId === targetNodeId &&
        c.targetConnectorId === targetConnectorId
    );

    if (exists) {
      console.warn('Connection already exists');
      return null;
    }

    set((state) => ({
      canvas: {
        ...state.canvas,
        connections: [
          ...state.canvas.connections,
          {
            id: connectionId,
            sourceNodeId,
            sourceConnectorId,
            targetNodeId,
            targetConnectorId,
          },
        ],
        updatedAt: Date.now(),
      },
    }));

    return connectionId;
  },

  removeConnection: (connectionId: string) =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        connections: state.canvas.connections.filter((c) => c.id !== connectionId),
        updatedAt: Date.now(),
      },
    })),

  selectNode: (nodeId: string | null) =>
    set((state) => ({
      ui: { ...state.ui, selectedNodeId: nodeId, selectedConnectionId: null },
    })),

  selectConnection: (connectionId: string | null) =>
    set((state) => ({
      ui: { ...state.ui, selectedConnectionId: connectionId, selectedNodeId: null },
    })),

  setDragging: (isDragging: boolean) =>
    set((state) => ({
      ui: { ...state.ui, isDragging },
    })),

  setDragOffset: (x: number, y: number) =>
    set((state) => ({
      ui: { ...state.ui, dragOffset: { x, y } },
    })),

  setZoom: (zoom: number) =>
    set((state) => ({
      ui: { ...state.ui, zoom: Math.max(0.1, Math.min(zoom, 3)) },
    })),

  setPan: (x: number, y: number) =>
    set((state) => ({
      ui: { ...state.ui, panX: x, panY: y },
    })),

  setOptimizedNodeIds: (nodeIds: string[]) =>
    set((state) => ({
      ui: { ...state.ui, optimizedNodeIds: nodeIds },
    })),

  clearCanvas: () =>
    set((state) => ({
      canvas: {
        id: uuidv4(),
        name: 'Nuevo Proyecto',
        nodes: [],
        connections: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      ui: {
        ...state.ui,
        selectedNodeId: null,
        selectedConnectionId: null,
        optimizedNodeIds: [],
      },
    })),

  loadCanvas: (canvas: CanvasState) =>
    set({
      canvas,
      ui: {
        selectedNodeId: null,
        selectedConnectionId: null,
        isDragging: false,
        dragOffset: { x: 0, y: 0 },
        zoom: 1,
        panX: 0,
        panY: 0,
        draggedNodeDefId: null,
        optimizedNodeIds: [],
      },
    }),

  updateNodeExecutionResult: (nodeId: string, result: NodeExecutionResult) =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        nodes: state.canvas.nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                output: result.output,
                outputByConnector: result.outputByConnector,
                lastRunAt: Date.now(),
              }
            : n
        ),
        updatedAt: Date.now(),
      },
    })),

  clearSimulationResults: () =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        nodes: state.canvas.nodes.map((n) => ({
          ...n,
          output: undefined,
          outputByConnector: undefined,
          lastError: null,
        })),
        updatedAt: Date.now(),
      },
    })),
}));
