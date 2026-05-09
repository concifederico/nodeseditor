import { Diagram } from '@prisma/client';
import { CanvasState, DiagramRecord } from '@/types';

export function diagramToCanvasState(diagram: Diagram): CanvasState {
  return {
    id: diagram.id,
    userId: diagram.userId,
    name: diagram.name,
    description: diagram.description ?? undefined,
    nodes: diagram.nodes as unknown as CanvasState['nodes'],
    connections: diagram.connections as unknown as CanvasState['connections'],
    createdAt: new Date(diagram.createdAt).getTime(),
    updatedAt: new Date(diagram.updatedAt).getTime(),
  };
}

export function diagramToRecord(diagram: Diagram): DiagramRecord {
  return {
    id: diagram.id,
    name: diagram.name,
    description: diagram.description,
    nodes: diagram.nodes as unknown as CanvasState['nodes'],
    connections: diagram.connections as unknown as CanvasState['connections'],
    createdAt: diagram.createdAt.toISOString(),
    updatedAt: diagram.updatedAt.toISOString(),
  };
}
