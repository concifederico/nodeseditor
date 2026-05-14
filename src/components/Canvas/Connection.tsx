'use client';

import React from 'react';
import { Connection as ConnectionType, CanvasState } from '@/types';
import { useCanvasStore } from '@/lib/store/canvasStore';

interface ConnectionProps {
  connection: ConnectionType;
  canvas: CanvasState;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export default function Connection({
  connection,
  canvas,
  isSelected,
  onSelect,
  onDelete,
}: ConnectionProps) {
  const nodeDefinitions = useCanvasStore((state) => state.nodeDefinitions);
  const sourceNode = canvas.nodes.find((n) => n.id === connection.sourceNodeId);
  const targetNode = canvas.nodes.find((n) => n.id === connection.targetNodeId);

  if (!sourceNode || !targetNode) return null;

  const sourceDefinition = nodeDefinitions.find((node) => node.id === sourceNode.definitionId);
  const targetDefinition = nodeDefinitions.find((node) => node.id === targetNode.definitionId);

  if (!sourceDefinition || !targetDefinition) return null;

  const sourceConnector = sourceDefinition.outputs.find(
    (c) => c.id === connection.sourceConnectorId
  );
  const targetConnector = targetDefinition.inputs.find(
    (c) => c.id === connection.targetConnectorId
  );

  if (!sourceConnector || !targetConnector) return null;

  // --- Get the value flowing through this connection ---
  const flowValue = sourceNode.outputByConnector?.[connection.sourceConnectorId];
  const flowLabel =
    flowValue !== undefined && flowValue !== null
      ? String(
          typeof flowValue === 'number'
            ? Number.isInteger(flowValue)
              ? flowValue
              : flowValue.toFixed(1)
            : flowValue
        )
      : null;

  // Also get the unit from the source connector's first property, if any
  const sourceProperty = sourceConnector.properties?.[0];
  const unit = sourceProperty?.unit ?? '';
  const labelText = flowLabel !== null ? `${flowLabel}${unit ? ` ${unit}` : ''}` : null;

  // Calculate label width based on text length (rough approximation: ~6px per char)
  const labelWidth = labelText ? Math.max(50, labelText.length * 7 + 16) : 60;

  // Calculate positions
  const sourceWidth = sourceDefinition.width || 120;
  const sourceHeight = sourceDefinition.height || 100;
  const targetHeight = targetDefinition.height || 100;

  // Get connector positions relative to nodes
  const sourceOutputs = sourceDefinition.outputs;
  const sourceConnectorIndex = sourceOutputs.findIndex(
    (c) => c.id === connection.sourceConnectorId
  );
  const sourceConnectorY =
    sourceHeight / (sourceOutputs.length + 1) * (sourceConnectorIndex + 1);

  const targetInputs = targetDefinition.inputs;
  const targetConnectorIndex = targetInputs.findIndex(
    (c) => c.id === connection.targetConnectorId
  );
  const targetConnectorY =
    targetHeight / (targetInputs.length + 1) * (targetConnectorIndex + 1);

  // Convert to absolute coordinates
  const x1 = sourceNode.x + sourceWidth + 8;
  const y1 = sourceNode.y + sourceConnectorY;
  const x2 = targetNode.x - 8;
  const y2 = targetNode.y + targetConnectorY;

  // Create smooth bezier curve
  const controlX = (x1 + x2) / 2;

  return (
    <g
      onClick={onSelect}
      style={{ cursor: 'pointer' }}
    >
      {/* Invisible line for easier clicking */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="transparent"
        strokeWidth="10"
        pointerEvents="auto"
      />

      {/* Visible connection line */}
      <path
        d={`M ${x1} ${y1} C ${controlX} ${y1} ${controlX} ${y2} ${x2} ${y2}`}
        fill="none"
        stroke={isSelected ? '#60a5fa' : '#3b82f6'}
        strokeWidth={isSelected ? '3' : '2'}
        pointerEvents="none"
      />

      {/* Flow value label pill in the middle of the connection */}
      {labelText && (
        <g pointerEvents="none">
          <rect
            x={controlX - labelWidth / 2}
            y={(y1 + y2) / 2 - 9}
            width={labelWidth}
            height={18}
            rx="9"
            fill="#1e293b"
            stroke="#475569"
            strokeWidth="1"
            opacity="0.92"
          />
          <text
            x={controlX}
            y={(y1 + y2) / 2 + 4}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="10"
            fontWeight="600"
            fontFamily="monospace"
          >
            {labelText}
          </text>
        </g>
      )}

      {/* Delete button - offset above the label */}
      {isSelected && (
        <g
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{ cursor: 'pointer' }}
        >
          <circle
            cx={(x1 + x2) / 2}
            cy={(y1 + y2) / 2 - 24}
            r="12"
            fill="#ef4444"
            stroke="white"
            strokeWidth="2"
          />
          <text
            x={(x1 + x2) / 2}
            y={(y1 + y2) / 2 - 20}
            textAnchor="middle"
            fill="white"
            fontSize="16"
            fontWeight="bold"
          >
            ×
          </text>
        </g>
      )}
    </g>
  );
}

