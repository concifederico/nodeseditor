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
import { Plus, Save } from 'lucide-react';

interface NodeLibraryEditorProps {
  onPersistDefinitions: (definitions: NodeDefinition[]) => Promise<void>;
  isSaving: boolean;
}

type TabDraft = NodeDefinition;

const CONFIG_TYPES: ConfigPropertyType[] = ['string', 'number', 'boolean', 'select'];
const CONNECTOR_TYPES = ['air', 'energy', 'water', 'number', 'string', 'boolean'] as const;

export default function NodeLibraryEditor({
  onPersistDefinitions,
  isSaving,
}: NodeLibraryEditorProps) {
  const nodeDefinitions = useCanvasStore((state) => state.nodeDefinitions);
  const setNodeDefinitions = useCanvasStore((state) => state.setNodeDefinitions);

  const [selectedDefinitionId, setSelectedDefinitionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TabDraft | null>(null);

  const updateDraft = (updater: (current: TabDraft) => TabDraft) => {
    setDraft((current) => (current ? updater(current) : current));
  };

  const handleNewDefinition = () => {
    const freshDefinition = createBlankNodeDefinition();
    setSelectedDefinitionId(freshDefinition.id);
    setDraft(freshDefinition);
  };

  const handleSaveDefinition = async () => {
    if (!draft) return;

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
    await onPersistDefinitions(nextDefinitions);
  };

  const handleSelectDefinition = (definitionId: string) => {
    const selected = nodeDefinitions.find((definition) => definition.id === definitionId);
    if (!selected) return;

    setSelectedDefinitionId(definitionId);
    setDraft(structuredClone(selected));
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
                  <input
                    type="number"
                    value={draft.width || 140}
                    onChange={(e) =>
                      updateDraft((current) => ({ ...current, width: Number(e.target.value) }))
                    }
                    className="px-3 py-2 bg-slate-800 text-white rounded text-sm border border-slate-600"
                    placeholder="Ancho"
                  />
                  <input
                    type="number"
                    value={draft.height || 100}
                    onChange={(e) =>
                      updateDraft((current) => ({ ...current, height: Number(e.target.value) }))
                    }
                    className="px-3 py-2 bg-slate-800 text-white rounded text-sm border border-slate-600"
                    placeholder="Alto"
                  />
                </div>

                <div className="text-xs text-slate-400">ID técnico: {draft.id}</div>
              </div>

              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
                {renderConnectorSection('input')}
                {renderConnectorSection('output')}
              </div>

              {renderConfigProperties()}

              <button
                type="button"
                onClick={handleSaveDefinition}
                disabled={isSaving}
                className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-900 text-white rounded text-sm flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {isSaving ? 'Guardando biblioteca...' : 'Guardar nodo en biblioteca'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
