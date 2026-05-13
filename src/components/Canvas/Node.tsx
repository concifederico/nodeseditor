'use client';

import React from 'react';
import { NodeInstance, NodeDefinition } from '@/types';

interface NodeProps {
  node: NodeInstance;
  definition: NodeDefinition;
  isSelected: boolean;
  isOptimized?: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onConnectorMouseDown: (connectorId: string, e: React.MouseEvent) => void;
  onConnectorMouseUp: (connectorId: string, e: React.MouseEvent) => void;
}

export default function Node({
  node,
  definition,
  isSelected,
  isOptimized = false,
  onSelect,
  onDelete,
  onMouseDown,
  onConnectorMouseDown,
  onConnectorMouseUp,
}: NodeProps) {
  const width = definition.width || 120;
  const height = definition.height || 100;
  const displayName = node.name?.trim() || definition.name;
  const displayClass = definition.name;
  const outputPreview =
    node.output === undefined || node.output === null
      ? null
      : JSON.stringify(node.output).slice(0, 42);

  // Calculate connector positions
  const inputConnectors = definition.inputs;
  const outputConnectors = definition.outputs;
  const connectorRadius = 8;

  const getConnectorY = (index: number, total: number) => {
    if (total === 1) return height / 2;
    return (height / (total + 1)) * (index + 1);
  };

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onMouseDown={onMouseDown}
      onClick={onSelect}
      style={{ cursor: 'grab' }}
    >
      {/* Node background */}
      <rect
        width={width}
        height={height}
        rx="8"
        fill={isSelected ? '#3b82f6' : '#1e293b'}
        stroke={isSelected ? '#60a5fa' : isOptimized ? '#f59e0b' : '#475569'}
        strokeWidth={isOptimized ? '3' : '2'}
        style={{ pointerEvents: 'auto' }}
      />

      {isOptimized && (
        <rect
          x="-3"
          y="-3"
          width={width + 6}
          height={height + 6}
          rx="11"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="1.5"
          strokeDasharray="6,4"
          opacity="0.9"
          pointerEvents="none"
        />
      )}

      {/* Delete button */}
      {isSelected && (
        <g
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{ cursor: 'pointer' }}
        >
          <circle
            cx={width - 12}
            cy={-12}
            r="10"
            fill="#ef4444"
            stroke="white"
            strokeWidth="1"
          />
          <text
            x={width - 12}
            y={-8}
            textAnchor="middle"
            fill="white"
            fontSize="14"
            fontWeight="bold"
          >
            ×
          </text>
        </g>
      )}

      {/* Node title */}
      <text
        x={width / 2}
        y={20}
        textAnchor="middle"
        fill="white"
        fontSize="12"
        fontWeight="bold"
      >
        {displayName}
      </text>

      {/* Node class */}
      <text
        x={width / 2}
        y={35}
        textAnchor="middle"
        fill="#9ca3af"
        fontSize="9"
      >
        {displayClass}
      </text>

      {/* Resource utilization bar */}
      {node.resourceUtilization !== undefined && (
        <g>
          <rect
            x="4"
            y="38"
            width={width - 8}
            height="3"
            rx="1"
            fill="#334155"
            stroke="#64748b"
            strokeWidth="0.5"
          />
          <rect
            x="4"
            y="38"
            width={(width - 8) * (node.resourceUtilization / 100)}
            height="3"
            rx="1"
            fill={
              node.resourceUtilization < 50
                ? '#10b981'
                : node.resourceUtilization < 80
                ? '#f59e0b'
                : '#ef4444'
            }
          />
          <text
            x={width / 2}
            y={37}
            textAnchor="middle"
            fill="#cbd5e1"
            fontSize="7"
            fontWeight="bold"
          >
            {Math.round(node.resourceUtilization)}%
          </text>
        </g>
      )}

      {/* Divider line */}
      <line
        x1="4"
        y1={node.resourceUtilization !== undefined ? "44" : "40"}
        x2={width - 4}
        y2={node.resourceUtilization !== undefined ? "44" : "40"}
        stroke="#475569"
        strokeWidth="1"
      />

      {(outputPreview || node.lastError) && (
        <g>
          <rect
            x="6"
            y={height - 26}
            width={width - 12}
            height="18"
            rx="6"
            fill={node.lastError ? '#450a0a' : '#0f766e'}
            opacity="0.95"
          />
          <text
            x={10}
            y={height - 14}
            textAnchor="start"
            fill="white"
            fontSize="8"
            fontWeight="bold"
          >
            {node.lastError
              ? `Error: ${node.lastError.slice(0, 28)}`
              : `Out: ${outputPreview}`}
          </text>
        </g>
      )}

      {/* Input connectors */}
      {inputConnectors.map((connector, index) => {
        const y = getConnectorY(index, inputConnectors.length);
        return (
          <g key={connector.id}>
            {/* Connector circle */}
            <circle
              cx={-connectorRadius}
              cy={y}
              r={connectorRadius}
              fill="#3b82f6"
              stroke="white"
              strokeWidth="2"
              style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
              onMouseDown={(e) => onConnectorMouseDown(connector.id, e)}
              onMouseUp={(e) => onConnectorMouseUp(connector.id, e)}
            />

            {/* Connector label */}
            <text
              x={-connectorRadius - 6}
              y={y + 4}
              textAnchor="end"
              fill="#d1d5db"
              fontSize="10"
            >
              {connector.name}
            </text>
          </g>
        );
      })}

      {/* Output connectors */}
      {outputConnectors.map((connector, index) => {
        const y = getConnectorY(index, outputConnectors.length);
        return (
          <g key={connector.id}>
            {/* Connector circle */}
            <circle
              cx={width + connectorRadius}
              cy={y}
              r={connectorRadius}
              fill="#10b981"
              stroke="white"
              strokeWidth="2"
              style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
              onMouseDown={(e) => onConnectorMouseDown(connector.id, e)}
              onMouseUp={(e) => onConnectorMouseUp(connector.id, e)}
            />

            {/* Connector label */}
            <text
              x={width + connectorRadius + 6}
              y={y + 4}
              textAnchor="start"
              fill="#d1d5db"
              fontSize="10"
            >
              {connector.name}
            </text>
          </g>
        );
      })}
    </g>
  );
}
