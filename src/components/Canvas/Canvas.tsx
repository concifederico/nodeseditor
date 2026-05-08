'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useCanvasStore } from '@/lib/store/canvasStore';
import Node from './Node';
import Connection from './Connection';

export default function Canvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [connectionStart, setConnectionStart] = useState<{
    nodeId: string;
    connectorId: string;
    x: number;
    y: number;
  } | null>(null);
  const [tempLineEnd, setTempLineEnd] = useState<{ x: number; y: number } | null>(null);

  const canvas = useCanvasStore((state) => state.canvas);
  const nodeDefinitions = useCanvasStore((state) => state.nodeDefinitions);
  const ui = useCanvasStore((state) => state.ui);
  const addNode = useCanvasStore((state) => state.addNode);
  const updateNodePosition = useCanvasStore((state) => state.updateNodePosition);
  const addConnection = useCanvasStore((state) => state.addConnection);
  const removeNode = useCanvasStore((state) => state.removeNode);
  const removeConnection = useCanvasStore((state) => state.removeConnection);
  const selectNode = useCanvasStore((state) => state.selectNode);
  const selectConnection = useCanvasStore((state) => state.selectConnection);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const setPan = useCanvasStore((state) => state.setPan);
  const setDraggedNodeDef = useCanvasStore((state) => state.setDraggedNodeDef);

  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return {
      x: (clientX - rect.left - ui.panX) / ui.zoom,
      y: (clientY - rect.top - ui.panY) / ui.zoom,
    };
  };

  // Handle mouse wheel zoom
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scale = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = ui.zoom * scale;
      setZoom(newZoom);
    };

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [ui.zoom, setZoom]);

  // Handle pan
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    let isPanning = false;
    let lastX = 0;
    let lastY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2 || e.button === 1) {
        isPanning = true;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const deltaX = (e.clientX - lastX) / ui.zoom;
        const deltaY = (e.clientY - lastY) / ui.zoom;
        setPan(ui.panX + deltaX, ui.panY + deltaY);
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };

    const handleMouseUp = () => {
      isPanning = false;
    };

    svg.addEventListener('mousedown', handleMouseDown);
    svg.addEventListener('mousemove', handleMouseMove);
    svg.addEventListener('mouseup', handleMouseUp);
    svg.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      svg.removeEventListener('mousedown', handleMouseDown);
      svg.removeEventListener('mousemove', handleMouseMove);
      svg.removeEventListener('mouseup', handleMouseUp);
      svg.removeEventListener('contextmenu', (e) => e.preventDefault());
    };
  }, [ui.zoom, ui.panX, ui.panY, setPan]);

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current) {
      selectNode(null);
      selectConnection(null);
    }
  };

  // Handle node drag
  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggingNodeId(nodeId);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingNodeId && dragStart) {
      const node = canvas.nodes.find((n) => n.id === draggingNodeId);
      if (node) {
        const deltaX = (e.clientX - dragStart.x) / ui.zoom;
        const deltaY = (e.clientY - dragStart.y) / ui.zoom;
        updateNodePosition(
          draggingNodeId,
          node.x + deltaX,
          node.y + deltaY
        );
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    }

    if (connectionStart) {
      const point = getCanvasPoint(e.clientX, e.clientY);
      if (point) {
        setTempLineEnd(point);
      }
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    setDragStart(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    const definitionId =
      e.dataTransfer.getData('text/plain') || ui.draggedNodeDefId;
    const point = getCanvasPoint(e.clientX, e.clientY);

    setDraggedNodeDef(null);

    if (!definitionId || !point) {
      return;
    }

    addNode(definitionId, point.x, point.y);
  };

  // Handle connection creation
  const handleConnectorMouseDown = (
    nodeId: string,
    connectorId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const point = getCanvasPoint(e.clientX, e.clientY);
    if (!point) return;

    setConnectionStart({
      nodeId,
      connectorId,
      x: point.x,
      y: point.y,
    });
  };

  const handleConnectorMouseUp = (
    nodeId: string,
    connectorId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    
    if (connectionStart && connectionStart.nodeId !== nodeId) {
      addConnection(
        connectionStart.nodeId,
        connectionStart.connectorId,
        nodeId,
        connectorId
      );
    }
    
    setConnectionStart(null);
    setTempLineEnd(null);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-slate-950 relative overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background grid */}
        <defs>
          <pattern
            id="grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${ui.panX}, ${ui.panY}) scale(${ui.zoom})`}
          >
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="rgba(100, 116, 139, 0.2)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        {/* Grid background */}
        <rect
          width="100%"
          height="100%"
          fill="url(#grid)"
          pointerEvents="none"
        />

        {/* Pan and zoom group */}
        <g transform={`translate(${ui.panX}, ${ui.panY}) scale(${ui.zoom})`}>
          {/* Connections */}
          {canvas.connections.map((conn) => (
            <Connection
              key={conn.id}
              connection={conn}
              canvas={canvas}
              isSelected={ui.selectedConnectionId === conn.id}
              onSelect={() => selectConnection(conn.id)}
              onDelete={() => removeConnection(conn.id)}
            />
          ))}

          {/* Temporary connection line */}
          {connectionStart && tempLineEnd && (
            <line
              x1={connectionStart.x}
              y1={connectionStart.y}
              x2={tempLineEnd.x}
              y2={tempLineEnd.y}
              stroke="rgba(59, 130, 246, 0.8)"
              strokeWidth="2"
              pointerEvents="none"
              strokeDasharray="5,5"
            />
          )}

          {/* Nodes */}
          {canvas.nodes.map((node) => {
            const definition = nodeDefinitions.find(
              (item) => item.id === node.definitionId
            );

            if (!definition) {
              return null;
            }

            return (
              <Node
                key={node.id}
                node={node}
                definition={definition}
                isSelected={ui.selectedNodeId === node.id}
                onSelect={() => selectNode(node.id)}
                onDelete={() => removeNode(node.id)}
                onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                onConnectorMouseDown={(connectorId, e) =>
                  handleConnectorMouseDown(node.id, connectorId, e)
                }
                onConnectorMouseUp={(connectorId, e) =>
                  handleConnectorMouseUp(node.id, connectorId, e)
                }
              />
            );
          })}
        </g>
      </svg>

      {/* Zoom info */}
      <div className="absolute top-4 left-4 bg-slate-900 px-3 py-2 rounded text-white text-sm">
        Zoom: {(ui.zoom * 100).toFixed(0)}%
      </div>
    </div>
  );
}
