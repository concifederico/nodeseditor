'use client';

import { create } from 'zustand';
import { CanvasState, NodeDefinition, NodeInstance, UIState } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getAllNodeDefinitions as getDefaultNodeDefinitions } from '../nodes';

interface CanvasStore {
  // Canvas state
  canvas: CanvasState;
  nodeDefinitions: NodeDefinition[];

  // UI state
  ui: UIState;

  // Canvas actions
  setCanvasName: (name: string) => void;
  setCanvasDescription: (description: string) => void;
  
  // Node actions
  addNode: (definitionId: string, x: number, y: number) => string;
  removeNode: (nodeId: string) => void;
  updateNodeName: (nodeId: string, name: string) => void;
  updateNodePosition: (nodeId: string, x: number, y: number) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, string | number | boolean>) => void;
  updateNodeScriptOverride: (nodeId: string, scriptOverride: string | undefined) => void;
  updateNodeExecutionResult: (
    nodeId: string,
    payload: {
      output: unknown;
      outputByConnector?: Record<string, unknown>;
      error?: string | null;
    }
  ) => void;
  clearSimulationResults: () => void;
  updateNodeResourceUtilization: (nodeId: string, utilization: number) => void;
  updateNodeCustomType: (nodeId: string, customType: string) => void;
  
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
  setDraggedNodeDef: (definitionId: string | null) => void;

  // Node definition actions
  setNodeDefinitions: (definitions: NodeDefinition[]) => void;
  getNodeDefinition: (definitionId: string) => NodeDefinition | undefined;

  // Canvas operations
  clearCanvas: () => void;
  loadCanvas: (canvas: CanvasState) => void;
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

  nodeDefinitions: getDefaultNodeDefinitions(),

  ui: {
    selectedNodeId: null,
    selectedConnectionId: null,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    zoom: 1,
    panX: 0,
    panY: 0,
    draggedNodeDefId: null,
  },

  setCanvasName: (name: string) =>
    set((state) => ({
      canvas: { ...state.canvas, name, updatedAt: Date.now() },
    })),

  setCanvasDescription: (description: string) =>
    set((state) => ({
      canvas: { ...state.canvas, description, updatedAt: Date.now() },
    })),

  addNode: (definitionId: string, x: number, y: number) => {
    const nodeId = uuidv4();
    const definition = get().nodeDefinitions.find((node) => node.id === definitionId);
    
    if (!definition) {
      console.error(`Node definition not found: ${definitionId}`);
      return nodeId;
    }

    // Create default config from definition
    const config: Record<string, string | number | boolean> = {};
    definition.configProperties.forEach((prop) => {
      config[prop.name] = prop.defaultValue;
    });

    const newNode: NodeInstance = {
      id: nodeId,
      definitionId,
      name: definition.name,
      x,
      y,
      config,
      connectorValues: {},
      scriptOverride: undefined,
      output: null,
      outputByConnector: {},
      lastError: null,
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

  updateNodeName: (nodeId: string, name: string) =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        nodes: state.canvas.nodes.map((n) =>
          n.id === nodeId ? { ...n, name } : n
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

  updateNodeConfig: (nodeId: string, config: Record<string, string | number | boolean>) =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        nodes: state.canvas.nodes.map((n) =>
          n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n
        ),
        updatedAt: Date.now(),
      },
    })),

  updateNodeScriptOverride: (nodeId: string, scriptOverride: string | undefined) =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        nodes: state.canvas.nodes.map((n) =>
          n.id === nodeId ? { ...n, scriptOverride, lastError: null } : n
        ),
        updatedAt: Date.now(),
      },
    })),

  updateNodeExecutionResult: (nodeId: string, payload) =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        nodes: state.canvas.nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                output: payload.output as NodeInstance['output'],
                outputByConnector:
                  (payload.outputByConnector as NodeInstance['outputByConnector']) ?? {},
                lastError: payload.error ?? null,
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
          output: null,
          outputByConnector: {},
          lastError: null,
          lastRunAt: undefined,
        })),
        updatedAt: Date.now(),
      },
    })),

  updateNodeResourceUtilization: (nodeId: string, utilization: number) =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        nodes: state.canvas.nodes.map((n) =>
          n.id === nodeId ? { ...n, resourceUtilization: Math.max(0, Math.min(100, utilization)) } : n
        ),
        updatedAt: Date.now(),
      },
    })),

  updateNodeCustomType: (nodeId: string, customType: string) =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        nodes: state.canvas.nodes.map((n) =>
          n.id === nodeId ? { ...n, customType } : n
        ),
        updatedAt: Date.now(),
      },
    })),

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

    // Prevent self-connections
    if (sourceNodeId === targetNodeId) {
      console.warn('Cannot connect a node to itself');
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

  setDraggedNodeDef: (definitionId: string | null) =>
    set((state) => ({
      ui: { ...state.ui, draggedNodeDefId: definitionId },
    })),

  setNodeDefinitions: (definitions: NodeDefinition[]) =>
    set((state) => ({
      nodeDefinitions: definitions,
      canvas: {
        ...state.canvas,
        updatedAt: Date.now(),
      },
    })),

  getNodeDefinition: (definitionId: string) =>
    get().nodeDefinitions.find((definition) => definition.id === definitionId),

  clearCanvas: () =>
    set((state) => ({
      ...state,
      canvas: {
        id: uuidv4(),
        name: 'Nuevo Proyecto',
        nodes: [],
        connections: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    })),

  loadCanvas: (canvas: CanvasState) =>
    set({
      canvas,
      nodeDefinitions: get().nodeDefinitions,
      ui: {
        selectedNodeId: null,
        selectedConnectionId: null,
        isDragging: false,
        dragOffset: { x: 0, y: 0 },
        zoom: 1,
        panX: 0,
        panY: 0,
        draggedNodeDefId: null,
      },
    }),
}));
