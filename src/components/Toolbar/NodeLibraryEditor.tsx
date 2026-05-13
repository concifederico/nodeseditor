'use client';

import React, { useState } from 'react';
import { NodeDefinition, ConfigPropertyType, ConnectorType } from '@/types';
import { useCanvasStore } from '@/lib/store/canvasStore';
import {
  createBlankNodeDefinition,
  createConfigProperty,
  createConnector,
  normalizeNodeDefinitions,
  slugifyNodePart,
} from '@/lib/nodeDefinitionUtils';
import { Plus, Save, Trash2, AlertCircle, CheckCircle, ChevronDown, Copy } from 'lucide-react';

interface NodeLibraryEditorProps {
  onPersistDefinitions: (
    definitions: NodeDefinition[],
    activeDefinition: NodeDefinition,
    deletedId?: string
  ) => Promise<void>;
  isSaving: boolean;
}

type TabDraft = NodeDefinition;

const CONFIG_TYPES: ConfigPropertyType[] = ['string', 'number', 'boolean', 'select'];
const CONNECTOR_TYPES = ['number', 'string', 'boolean'] as const;

export default function NodeLibraryEditor({
  onPersistDefinitions,
  isSaving,
}: NodeLibraryEditorProps) {
  const nodeDefinitions = useCanvasStore((state) => state.nodeDefinitions);
  const setNodeDefinitions = useCanvasStore((state) => state.setNodeDefinitions);

  const [selectedDefinitionId, setSelectedDefinitionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TabDraft | null>(null);
  const [scriptTestResult, setScriptTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showScriptHelp, setShowScriptHelp] = useState(false);

  const updateDraft = (updater: (current: TabDraft) => TabDraft) => {
    setDraft((current) => (current ? updater(current) : current));
  };

  // Generate example Python script based on current definition
  const generateExampleScript = (definition: TabDraft): string => {
    const firstConfigCapacity = definition.configProperties.find(
      (p) => p.type === 'number' && (p.name.toLowerCase().includes('capacity') || p.name.toLowerCase().includes('max') || p.name.toLowerCase().includes('rate'))
    );
    const capacityVar = firstConfigCapacity?.name ?? 'max_capacity';
    const inputVar = definition.inputs[0]?.properties[0]
      ? `${definition.inputs[0].id}_${definition.inputs[0].properties[0].name}`
      : definition.inputs[0]?.id ?? 'input_value';
    const outputIds = definition.outputs.length > 0
      ? definition.outputs.map((output) => `${output.id} = ${inputVar}`)
      : ['output_1 = input_value'];

    return `# Script para: ${definition.name}
# Variables disponibles directamente en el namespace:
${definition.configProperties.length > 0 ? definition.configProperties.map((prop) => `# - ${prop.name}${prop.unit ? ` (${prop.unit})` : ''}`).join('\n') : '# - sin propiedades de configuracion'}
${definition.inputs.length > 0 ? definition.inputs.map((input) => `# - ${input.id}${input.properties.length > 0 ? ` y ${input.properties.map((p) => `${input.id}_${p.name}`).join(', ')}` : ''}`).join('\n') : '# - sin entradas'}

# --- Calculo de ejemplo ---
# Lee la variable de entrada principal
${inputVar} = ${inputVar}

# Propiedades de configuracion disponibles como variables
${definition.configProperties.length > 0
  ? definition.configProperties
      .map((prop) => `${prop.name} = ${prop.name}`)
      .join('\n')
  : '# sin variables de configuracion'}

# --- Throughput y Utilization ---
# El throughput (caudal de salida) se propaga desde la entrada
throughput = ${inputVar}

${outputIds.join('\n')}

# La capacidad maxima del nodo (se puede tomar de config o definir aca)
${capacityVar} = ${capacityVar} if '${capacityVar}' in dir() else 100

# La utilization (%) es la relacion entre el throughput real y la capacidad maxima
if ${capacityVar} > 0:
    utilization = min(round((throughput / ${capacityVar}) * 100, 1), 100)
else:
    utilization = 0.0

# El campo "utilization" (en minusculas) actualiza automaticamente
# la barra de % Utilizacion de Recurso en el panel de propiedades.
# Valores posibles: 0.0 a 100.0`;
  };

  const validateNodeScript = (definition: NodeDefinition): { success: boolean; message: string } => {
    if (!definition.defaultScript?.trim()) {
      return { success: true, message: '✓ Script vacío (válido)' };
    }

    const script = definition.defaultScript.trim();
    const lines = script.split('\n');
    const errors: string[] = [];

    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack: string[] = [];
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < script.length; i++) {
      const char = script[i];
      const prevChar = i > 0 ? script[i - 1] : '';

      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        continue;
      }

      if (inString) continue;

      if (brackets[char as keyof typeof brackets]) {
        stack.push(char);
      } else if (Object.values(brackets).includes(char)) {
        const last = stack.pop();
        if (!last || brackets[last as keyof typeof brackets] !== char) {
          errors.push(`Paréntesis/corchetes desbalanceados cerca de posición ${i}`);
          break;
        }
      }
    }

    if (stack.length > 0) {
      errors.push(`Paréntesis/corchetes sin cerrar: ${stack.join(', ')}`);
    }

    const singleQuotes = (script.match(/(?<!\\)'/g) || []).length;
    const doubleQuotes = (script.match(/(?<!\\)"/g) || []).length;
    const backticks = (script.match(/(?<!\\)`/g) || []).length;

    if (singleQuotes % 2 !== 0) errors.push('Comillas simples desbalanceadas');
    if (doubleQuotes % 2 !== 0) errors.push('Comillas dobles desbalanceadas');
    if (backticks % 2 !== 0) errors.push('Backticks desbalanceados');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (trimmed.endsWith(':')) {
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const nextTrimmed = nextLine.trim();
          if (nextTrimmed && !nextTrimmed.startsWith('#')) {
            const currentIndent = line.search(/\S/);
            const nextIndent = nextLine.search(/\S/);
            if (nextIndent <= currentIndent) {
              errors.push(`Línea ${i + 2}: Indentación insuficiente después de ':' en línea ${i + 1}`);
            }
          }
        }
      }
    }

    const invalidChars = script.match(/[^\w\s\(\)\[\]\{\}:"'`.,;=#\-+*/%&|^!<>@\\.\\n\\t]/g);
    if (invalidChars && invalidChars.length > 0) {
      const unique = [...new Set(invalidChars)];
      errors.push(`Caracteres inválidos: ${unique.join(', ')}`);
    }

    if (errors.length > 0) {
      return { success: false, message: `✗ ${errors[0]}` };
    }

    return { success: true, message: '✓ Script validado correctamente' };
  };

  const handleNewDefinition = () => {
    const freshDefinition = createBlankNodeDefinition();
    setSelectedDefinitionId(freshDefinition.id);
    setDraft(freshDefinition);
  };

  const handleSelectDefinition = (definitionId: string) => {
    const selectedDefinition = nodeDefinitions.find(
      (definition) => definition.id === definitionId
    );
    if (selectedDefinition) {
      setSelectedDefinitionId(definitionId);
      setDraft(structuredClone(selectedDefinition));
    }
  };

  const handleSaveDefinition = async () => {
    if (!draft) return;

    const validation = validateNodeScript(draft);
    setScriptTestResult(validation);

    const nextDefinitions = normalizeNodeDefinitions(
      nodeDefinitions.some((definition) => definition.id === draft.id)
        ? nodeDefinitions.map((definition) =>
            definition.id === draft.id ? draft : definition
          )
        : [...nodeDefinitions, draft]
    );

    const savedDefinition =
      nextDefinitions.find((definition) => definition.id === draft.id) ||
      nextDefinitions[nextDefinitions.length - 1];

    setNodeDefinitions(nextDefinitions);
    setSelectedDefinitionId(savedDefinition.id);
    setDraft(structuredClone(savedDefinition));
    await onPersistDefinitions(nextDefinitions, savedDefinition);
  };

  const handleDeleteDefinition = async () => {
    if (!selectedDefinitionId) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar este nodo? Esta acción no se puede deshacer.`))
      return;

    const deletedId = selectedDefinitionId;
    const nextDefinitions = nodeDefinitions.filter(
      (definition) => definition.id !== selectedDefinitionId
    );

    setNodeDefinitions(nextDefinitions);
    setSelectedDefinitionId(null);
    setDraft(null);
    await onPersistDefinitions(
      nextDefinitions,
      nextDefinitions[0] || createBlankNodeDefinition(),
      deletedId
    );
  };

  const renderConnectorSection = (type: ConnectorType) => {
    if (!draft) return null;

    const connectors = type === 'input' ? draft.inputs : draft.outputs;

    return (
      <div className="bg-slate-800 rounded p-3 border border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-white font-semibold text-sm">
            {type === 'input' ? 'Entradas' : 'Salidas'}
          </h4>
          <button
            type="button"
            onClick={() =>
              updateDraft((current) => ({
                ...current,
                [type === 'input' ? 'inputs' : 'outputs']: [
                  ...(type === 'input' ? current.inputs : current.outputs),
                  createConnector(type, connectors.length),
                ],
              }))
            }
            className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-white"
          >
            + Agregar
          </button>
        </div>

        {connectors.map((connector, index) => (
          <div key={`${type}-${index}`} className="rounded border border-slate-700 p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={connector.name}
                onChange={(e) =>
                  updateDraft((current) => ({
                    ...current,
                    [type === 'input' ? 'inputs' : 'outputs']: connectors.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            name: e.target.value,
                            id: slugifyNodePart(e.target.value, `${type}_${index + 1}`),
                          }
                        : item
                    ),
                  }))
                }
                className="px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600"
                placeholder="Nombre"
              />
              <select
                value={connector.valueType}
                onChange={(e) =>
                  updateDraft((current) => ({
                    ...current,
                    [type === 'input' ? 'inputs' : 'outputs']: connectors.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, valueType: e.target.value as (typeof CONNECTOR_TYPES)[number] }
                        : item
                    ),
                  }))
                }
                className="px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600"
              >
                {CONNECTOR_TYPES.map((valueType) => (
                  <option key={valueType} value={valueType}>
                    {valueType}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={connector.properties
                .map((property) => `${property.name}${property.unit ? ` (${property.unit})` : ''}`)
                .join(', ')}
              onChange={(e) =>
                updateDraft((current) => ({
                  ...current,
                  [type === 'input' ? 'inputs' : 'outputs']: connectors.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          properties: e.target.value
                            .split(',')
                            .map((part) => part.trim())
                            .filter(Boolean)
                            .map((part) => ({ name: slugifyNodePart(part, 'campo'), type: 'number', required: false })),
                        }
                      : item
                  ),
                }))
              }
              className="w-full px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600 min-h-16"
              placeholder="Campos del conector separados por coma"
            />

            <button
              type="button"
              onClick={() =>
                updateDraft((current) => ({
                  ...current,
                  [type === 'input' ? 'inputs' : 'outputs']: connectors.filter(
                    (_, itemIndex) => itemIndex !== index
                  ),
                }))
              }
              className="text-xs text-red-300 hover:text-red-200"
            >
              Quitar {type === 'input' ? 'entrada' : 'salida'}
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderConfigProperties = () => {
    if (!draft) return null;

    return (
      <div className="bg-slate-800 rounded p-3 border border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-white font-semibold text-sm">Propiedades del nodo</h4>
          <button
            type="button"
            onClick={() =>
              updateDraft((current) => ({
                ...current,
                configProperties: [
                  ...current.configProperties,
                  createConfigProperty(current.configProperties.length),
                ],
              }))
            }
            className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-white"
          >
            + Agregar
          </button>
        </div>

        {draft.configProperties.map((property, index) => (
          <div key={`${property.name}-${index}`} className="rounded border border-slate-700 p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={property.label}
                onChange={(e) =>
                  updateDraft((current) => ({
                    ...current,
                    configProperties: current.configProperties.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            label: e.target.value,
                            name: slugifyNodePart(e.target.value, `property_${index + 1}`),
                          }
                        : item
                    ),
                  }))
                }
                className="px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600"
                placeholder="Etiqueta"
              />
              <select
                value={property.type}
                onChange={(e) =>
                  updateDraft((current) => ({
                    ...current,
                    configProperties: current.configProperties.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            type: e.target.value as ConfigPropertyType,
                            defaultValue:
                              e.target.value === 'number'
                                ? 0
                                : e.target.value === 'boolean'
                                ? false
                                : '',
                            options: e.target.value === 'select' ? [] : undefined,
                          }
                        : item
                    ),
                  }))
                }
                className="px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600"
              >
                {CONFIG_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type={property.type === 'number' ? 'number' : 'text'}
                value={
                  property.type === 'boolean'
                    ? property.defaultValue
                      ? 'true'
                      : 'false'
                    : `${property.defaultValue ?? ''}`
                }
                onChange={(e) =>
                  updateDraft((current) => ({
                    ...current,
                    configProperties: current.configProperties.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            defaultValue:
                              property.type === 'number'
                                ? Number(e.target.value)
                                : property.type === 'boolean'
                                ? e.target.value === 'true'
                                : e.target.value,
                          }
                        : item
                    ),
                  }))
                }
                className="px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600"
                placeholder="Valor por defecto"
              />
              {property.type === 'boolean' ? (
                <select
                  value={property.defaultValue ? 'true' : 'false'}
                  onChange={(e) =>
                    updateDraft((current) => ({
                      ...current,
                      configProperties: current.configProperties.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, defaultValue: e.target.value === 'true' }
                          : item
                      ),
                    }))
                  }
                  className="px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600"
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={property.unit || ''}
                  onChange={(e) =>
                    updateDraft((current) => ({
                      ...current,
                      configProperties: current.configProperties.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, unit: e.target.value } : item
                      ),
                    }))
                  }
                  className="px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600"
                  placeholder="Unidad"
                />
              )}
            </div>

            {property.type === 'select' && (
              <textarea
                value={(property.options || []).map((option) => option.label).join(', ')}
                onChange={(e) =>
                  updateDraft((current) => ({
                    ...current,
                    configProperties: current.configProperties.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            options: e.target.value
                              .split(',')
                              .map((part) => part.trim())
                              .filter(Boolean)
                              .map((part) => ({ label: part, value: part })),
                          }
                        : item
                    ),
                  }))
                }
                className="w-full px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600 min-h-16"
                placeholder="Opciones separadas por coma"
              />
            )}

            <button
              type="button"
              onClick={() =>
                updateDraft((current) => ({
                  ...current,
                  configProperties: current.configProperties.filter(
                    (_, itemIndex) => itemIndex !== index
                  ),
                }))
              }
              className="text-xs text-red-300 hover:text-red-200"
            >
              Quitar propiedad
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full overflow-hidden flex flex-col bg-slate-950">
      <div className="p-5 border-b border-slate-700 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-white font-bold text-lg">Biblioteca de nodos</h3>
          <p className="text-slate-400 text-sm mt-1">
            Define entradas, salidas y propiedades para reutilizar estos nodos más adelante.
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewDefinition}
          className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shrink-0"
        >
          <Plus size={16} />
          Nuevo
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="w-64 border-r border-slate-700 overflow-y-auto p-3 space-y-2 bg-slate-900/60">
          {nodeDefinitions.map((definition) => (
            <button
              key={definition.id}
              type="button"
              onClick={() => handleSelectDefinition(definition.id)}
              className={`w-full text-left px-3 py-3 rounded text-sm border transition ${
                selectedDefinitionId === definition.id
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              <div className="font-semibold">{definition.name}</div>
              <div className="text-xs text-slate-400 mt-1">{definition.category}</div>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!draft ? (
            <div className="text-slate-400 text-sm">
              Selecciona un nodo existente o crea uno nuevo desde esta pestaña.
            </div>
          ) : (
            <>
              {/* Informacion general del nodo */}
              <div className="bg-slate-900 rounded-xl p-5 border border-slate-700 space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) =>
                      updateDraft((current) => ({
                        ...current,
                        name: e.target.value,
                        id: slugifyNodePart(current.id || e.target.value, `custom_${Date.now()}`),
                      }))
                    }
                    className="px-3 py-2 bg-slate-800 text-white rounded text-sm border border-slate-600"
                    placeholder="Nombre del nodo"
                  />
                  <input
                    type="text"
                    value={draft.category}
                    onChange={(e) =>
                      updateDraft((current) => ({ ...current, category: e.target.value }))
                    }
                    className="px-3 py-2 bg-slate-800 text-white rounded text-sm border border-slate-600"
                    placeholder="Categoría"
                  />
                </div>

                <textarea
                  value={draft.description}
                  onChange={(e) =>
                    updateDraft((current) => ({ ...current, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-800 text-white rounded text-sm border border-slate-600 min-h-24"
                  placeholder="Descripción"
                />

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 text-xs block mb-1">Ancho (px)</label>
                    <input
                      type="number"
                      value={draft.width || 140}
                      onChange={(e) =>
                        updateDraft((current) => ({ ...current, width: Number(e.target.value) }))
                      }
                      className="w-full px-3 py-2 bg-slate-800 text-white rounded text-sm border border-slate-600"
                      placeholder="140"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-xs block mb-1">Alto (px)</label>
                    <input
                      type="number"
                      value={draft.height || 100}
                      onChange={(e) =>
                        updateDraft((current) => ({ ...current, height: Number(e.target.value) }))
                      }
                      className="w-full px-3 py-2 bg-slate-800 text-white rounded text-sm border border-slate-600"
                      placeholder="100"
                    />
                  </div>
                </div>

                <div className="text-xs text-slate-400">ID técnico: {draft.id}</div>
              </div>

              {/* 1) Entradas y Salidas */}
              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
                {renderConnectorSection('input')}
                {renderConnectorSection('output')}
              </div>

              {/* 2) Propiedades del nodo */}
              {renderConfigProperties()}

              {/* 3) Editor de Python */}
              <div className="bg-slate-900 rounded-xl p-5 border border-slate-700 space-y-4">
                <div>
                  <h4 className="text-white font-semibold text-sm">Script por defecto</h4>
                  <p className="text-slate-400 text-xs mt-1">
                    Este bloque se ejecuta usando las entradas y propiedades definidas arriba.
                  </p>
                </div>

                <textarea
                  value={draft.defaultScript ?? ''}
                  onChange={(e) =>
                    updateDraft((current) => ({ ...current, defaultScript: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-800 text-white rounded text-sm border border-slate-600 min-h-40 font-mono"
                  placeholder="Script Python por defecto del bloque"
                  spellCheck={false}
                />

                <div className="bg-slate-800 rounded border border-slate-700 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowScriptHelp(!showScriptHelp)}
                    className="w-full px-3 py-3 flex items-center justify-between hover:bg-slate-700 transition text-white"
                  >
                    <span className="text-sm font-semibold">💡 Ayuda: Plantilla de Ejemplo</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${showScriptHelp ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showScriptHelp && (
                    <div className="border-t border-slate-700 p-3 space-y-3">
                      <p className="text-xs text-slate-300">
                        Haz clic para copiar una plantilla de ejemplo que incluye:
                      </p>
                      <ul className="text-xs text-slate-400 space-y-1 ml-3">
                        <li>✓ Acceso a todas las entradas ({draft.inputs.length || 0} entradas)</li>
                        <li>✓ Acceso a configuración ({draft.configProperties.length || 0} propiedades)</li>
                        <li>✓ Cálculo de capacidad máxima del nodo</li>
                        <li>✓ Cálculo de % Utilization a partir de throughput / capacidad</li>
                        <li>✓ Formato de salida correcto ({draft.outputs.length || 0} salidas)</li>
                      </ul>

                      <div className="bg-slate-900 rounded p-2 text-xs font-mono text-slate-200 max-h-48 overflow-y-auto border border-slate-600">
                        {generateExampleScript(draft).split('\n').map((line, idx) => (
                          <div key={idx} className="whitespace-pre-wrap break-all">
                            {line}
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const example = generateExampleScript(draft);
                          navigator.clipboard.writeText(example);
                          alert('Plantilla copiada al portapapeles');
                        }}
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded flex items-center justify-center gap-2 transition"
                      >
                        <Copy size={14} />
                        Copiar Plantilla
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {scriptTestResult && (
                <div className={`p-3 rounded border-l-4 ${
                  scriptTestResult.success 
                    ? 'bg-emerald-900/30 border-l-emerald-500 text-emerald-200' 
                    : 'bg-red-900/30 border-l-red-500 text-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {scriptTestResult.success ? (
                      <CheckCircle size={16} />
                    ) : (
                      <AlertCircle size={16} />
                    )}
                    <span className="text-sm">{scriptTestResult.message}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveDefinition}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-900 text-white rounded text-sm flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {isSaving ? 'Guardando biblioteca...' : 'Guardar nodo en biblioteca'}
                </button>
                {selectedDefinitionId && (
                  <button
                    type="button"
                    onClick={handleDeleteDefinition}
                    className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded text-sm flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Eliminar
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
