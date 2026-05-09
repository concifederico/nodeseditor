import {
  ConfigPropertyDefinition,
  ConfigPropertyType,
  Connector,
  ConnectorProperty,
  ConnectorType,
  ConnectorValueType,
  NodeDefinition,
} from '@/types';

export function slugifyNodePart(value: string, fallback: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || fallback;
}

export function createConnectorProperty(): ConnectorProperty {
  return {
    name: 'valor',
    type: 'number',
    required: false,
    unit: '',
  };
}

export function createConnector(type: ConnectorType, index = 0): Connector {
  return {
    id: `${type}_${index + 1}`,
    name: type === 'input' ? `Entrada ${index + 1}` : `Salida ${index + 1}`,
    type,
    valueType: 'air',
    properties: [],
  };
}

export function createConfigProperty(index = 0): ConfigPropertyDefinition {
  return {
    name: `propiedad_${index + 1}`,
    label: `Propiedad ${index + 1}`,
    type: 'string',
    defaultValue: '',
    unit: '',
    options: [],
  };
}

export function createBlankNodeDefinition(): NodeDefinition {
  return {
    id: `custom_${Date.now()}`,
    name: 'Nuevo nodo',
    category: 'custom',
    description: '',
    inputs: [createConnector('input', 0)],
    outputs: [createConnector('output', 0)],
    configProperties: [],
    defaultScript: 'result = inputs\n',
    width: 140,
    height: 100,
  };
}

function sanitizeValueByType(
  value: string | number | boolean,
  type: ConfigPropertyType | ConnectorValueType
) {
  if (type === 'number') {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (type === 'boolean') {
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === '1';
  }

  return `${value ?? ''}`;
}

export function normalizeNodeDefinition(definition: NodeDefinition): NodeDefinition {
  const inputs = definition.inputs.map((connector, index) =>
    normalizeConnector(connector, 'input', index)
  );
  const outputs = definition.outputs.map((connector, index) =>
    normalizeConnector(connector, 'output', index)
  );

  return {
    ...definition,
    id: slugifyNodePart(definition.id || definition.name, `custom_${Date.now()}`),
    name: definition.name.trim() || 'Nodo sin nombre',
    category: definition.category.trim() || 'custom',
    description: definition.description.trim(),
    inputs,
    outputs,
    defaultScript: `${definition.defaultScript ?? ''}`.trim(),
    parameters:
      definition.parameters && typeof definition.parameters === 'object'
        ? definition.parameters
        : undefined,
    configProperties: definition.configProperties.map((property, index) => ({
      ...property,
      name: slugifyNodePart(property.name || property.label, `property_${index + 1}`),
      label: property.label.trim() || `Propiedad ${index + 1}`,
      type: property.type,
      unit: property.unit?.trim() || undefined,
      defaultValue: sanitizeValueByType(property.defaultValue, property.type),
      options:
        property.type === 'select'
          ? (property.options || [])
              .map((option, optionIndex) => ({
                label: option.label.trim() || `Opción ${optionIndex + 1}`,
                value: sanitizeValueByType(option.value, 'string'),
              }))
              .filter((option) => option.label.length > 0)
          : undefined,
    })),
    width: Number.isFinite(definition.width) ? Math.max(100, Number(definition.width)) : 140,
    height: Number.isFinite(definition.height) ? Math.max(80, Number(definition.height)) : 100,
  };
}

export function normalizeNodeDefinitions(definitions: NodeDefinition[]) {
  const seen = new Set<string>();

  return definitions.map((definition, index) => {
    const normalized = normalizeNodeDefinition(definition);
    let nextId = normalized.id;

    while (seen.has(nextId)) {
      nextId = `${normalized.id}_${index + 1}`;
    }

    seen.add(nextId);
    return { ...normalized, id: nextId };
  });
}

function normalizeConnector(
  connector: Connector,
  type: ConnectorType,
  index: number
): Connector {
  return {
    ...connector,
    id: slugifyNodePart(connector.id || connector.name, `${type}_${index + 1}`),
    name: connector.name.trim() || `${type === 'input' ? 'Entrada' : 'Salida'} ${index + 1}`,
    type,
    valueType: connector.valueType,
    properties: (connector.properties || []).map((property, propertyIndex) => ({
      ...property,
      name: slugifyNodePart(property.name, `campo_${propertyIndex + 1}`),
      unit: property.unit?.trim() || undefined,
      defaultValue:
        property.defaultValue === undefined
          ? undefined
          : sanitizeValueByType(property.defaultValue, property.type),
    })),
    position:
      type === 'input'
        ? { x: 0, y: 30 + index * 28 }
        : { x: 100, y: 30 + index * 28 },
  };
}
