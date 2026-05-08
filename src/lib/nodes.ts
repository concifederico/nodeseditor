import { NodeDefinition } from '@/types';

// Pre-defined node definitions
export const DEFAULT_NODE_DEFINITIONS: Record<string, NodeDefinition> = {
  compressor: {
    id: 'compressor',
    name: 'Compresor de Aire',
    category: 'compressor',
    description: 'Compresor que convierte energía en aire comprimido',
    inputs: [
      {
        id: 'energy_in',
        name: 'Energía',
        type: 'input',
        valueType: 'energy',
        properties: [
          {
            name: 'power',
            type: 'number',
            unit: 'kW',
            required: true,
          },
        ],
        position: { x: 0, y: 30 },
      },
    ],
    outputs: [
      {
        id: 'air_out',
        name: 'Aire Comprimido',
        type: 'output',
        valueType: 'air',
        properties: [
          {
            name: 'flow',
            type: 'number',
            unit: 'm³/min',
            required: true,
          },
          {
            name: 'pressure',
            type: 'number',
            unit: 'bar',
            required: true,
          },
        ],
        position: { x: 100, y: 20 },
      },
      {
        id: 'residue_out',
        name: 'Residuo (Agua + Aceite)',
        type: 'output',
        valueType: 'water',
        properties: [
          {
            name: 'amount',
            type: 'number',
            unit: 'L',
            required: false,
          },
        ],
        position: { x: 100, y: 60 },
      },
    ],
    configProperties: [
      {
        name: 'power',
        label: 'Potencia del Compresor',
        type: 'number',
        unit: 'kW',
        defaultValue: 7.5,
      },
      {
        name: 'model',
        label: 'Modelo',
        type: 'string',
        defaultValue: 'Standard',
      },
      {
        name: 'efficiency',
        label: 'Eficiencia',
        type: 'number',
        unit: '%',
        defaultValue: 85,
      },
    ],
    width: 120,
    height: 100,
  },

  tank: {
    id: 'tank',
    name: 'Tanque de Almacenamiento',
    category: 'tank',
    description: 'Tanque para almacenar aire comprimido',
    inputs: [
      {
        id: 'air_in',
        name: 'Entrada Aire',
        type: 'input',
        valueType: 'air',
        properties: [
          {
            name: 'flow',
            type: 'number',
            unit: 'm³/min',
            required: true,
          },
          {
            name: 'pressure',
            type: 'number',
            unit: 'bar',
            required: true,
          },
        ],
        position: { x: 0, y: 40 },
      },
    ],
    outputs: [
      {
        id: 'air_out',
        name: 'Salida Aire',
        type: 'output',
        valueType: 'air',
        properties: [
          {
            name: 'flow',
            type: 'number',
            unit: 'm³/min',
            required: true,
          },
          {
            name: 'pressure',
            type: 'number',
            unit: 'bar',
            required: true,
          },
        ],
        position: { x: 100, y: 40 },
      },
    ],
    configProperties: [
      {
        name: 'volume',
        label: 'Volumen del Tanque',
        type: 'number',
        unit: 'L',
        defaultValue: 500,
      },
      {
        name: 'maxPressure',
        label: 'Presión Máxima',
        type: 'number',
        unit: 'bar',
        defaultValue: 10,
      },
    ],
    width: 110,
    height: 90,
  },

  filter: {
    id: 'filter',
    name: 'Filtro',
    category: 'filter',
    description: 'Filtra el aire comprimido',
    inputs: [
      {
        id: 'air_in',
        name: 'Aire',
        type: 'input',
        valueType: 'air',
        properties: [
          {
            name: 'flow',
            type: 'number',
            unit: 'm³/min',
            required: true,
          },
          {
            name: 'pressure',
            type: 'number',
            unit: 'bar',
            required: true,
          },
        ],
        position: { x: 0, y: 35 },
      },
    ],
    outputs: [
      {
        id: 'air_out',
        name: 'Aire Filtrado',
        type: 'output',
        valueType: 'air',
        properties: [
          {
            name: 'flow',
            type: 'number',
            unit: 'm³/min',
            required: true,
          },
          {
            name: 'pressure',
            type: 'number',
            unit: 'bar',
            required: true,
          },
        ],
        position: { x: 100, y: 35 },
      },
      {
        id: 'residue_out',
        name: 'Residuo',
        type: 'output',
        valueType: 'water',
        properties: [
          {
            name: 'amount',
            type: 'number',
            unit: 'L',
            required: false,
          },
        ],
        position: { x: 100, y: 60 },
      },
    ],
    configProperties: [
      {
        name: 'filterType',
        label: 'Tipo de Filtro',
        type: 'select',
        defaultValue: 'standard',
        options: [
          { label: 'Estándar', value: 'standard' },
          { label: 'Cartucho', value: 'cartridge' },
          { label: 'Coalescente', value: 'coalescing' },
        ],
      },
    ],
    width: 100,
    height: 90,
  },

  regulator: {
    id: 'regulator',
    name: 'Regulador de Presión',
    category: 'regulator',
    description: 'Regula la presión del aire',
    inputs: [
      {
        id: 'air_in',
        name: 'Aire',
        type: 'input',
        valueType: 'air',
        properties: [
          {
            name: 'flow',
            type: 'number',
            unit: 'm³/min',
            required: true,
          },
          {
            name: 'pressure',
            type: 'number',
            unit: 'bar',
            required: true,
          },
        ],
        position: { x: 0, y: 40 },
      },
    ],
    outputs: [
      {
        id: 'air_out',
        name: 'Aire Regulado',
        type: 'output',
        valueType: 'air',
        properties: [
          {
            name: 'flow',
            type: 'number',
            unit: 'm³/min',
            required: true,
          },
          {
            name: 'pressure',
            type: 'number',
            unit: 'bar',
            required: true,
          },
        ],
        position: { x: 100, y: 40 },
      },
    ],
    configProperties: [
      {
        name: 'setpoint',
        label: 'Presión de Salida',
        type: 'number',
        unit: 'bar',
        defaultValue: 6,
      },
    ],
    width: 100,
    height: 80,
  },
};

// Function to get node definition
export function getNodeDefinition(definitionId: string): NodeDefinition | undefined {
  return DEFAULT_NODE_DEFINITIONS[definitionId];
}

// Function to get all available node definitions
export function getAllNodeDefinitions(): NodeDefinition[] {
  return Object.values(DEFAULT_NODE_DEFINITIONS);
}

// Function to get node definitions by category
export function getNodesByCategory(category: string): NodeDefinition[] {
  return Object.values(DEFAULT_NODE_DEFINITIONS).filter(
    (node) => node.category === category
  );
}
