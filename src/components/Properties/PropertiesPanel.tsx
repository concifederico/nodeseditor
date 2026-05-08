'use client';

import React from 'react';
import { useCanvasStore } from '@/lib/store/canvasStore';

export default function PropertiesPanel() {
  const canvas = useCanvasStore((state) => state.canvas);
  const nodeDefinitions = useCanvasStore((state) => state.nodeDefinitions);
  const ui = useCanvasStore((state) => state.ui);
  const updateNodeName = useCanvasStore((state) => state.updateNodeName);
  const updateNodeConfig = useCanvasStore((state) => state.updateNodeConfig);
  const updateNodeResourceUtilization = useCanvasStore((state) => state.updateNodeResourceUtilization);
  const updateNodeCustomType = useCanvasStore((state) => state.updateNodeCustomType);

  const selectedNode = canvas.nodes.find((n) => n.id === ui.selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="w-full h-full bg-slate-900 border-l border-slate-700 p-4 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <p className="text-sm">Selecciona un nodo para ver sus propiedades</p>
        </div>
      </div>
    );
  }

  const definition = nodeDefinitions.find((node) => node.id === selectedNode.definitionId);

  if (!definition) {
    return (
      <div className="w-full h-full bg-slate-900 border-l border-slate-700 p-4">
        <p className="text-red-400 text-sm">Error: Definición de nodo no encontrada</p>
      </div>
    );
  }

  const handleConfigChange = (propName: string, value: string | number | boolean) => {
    updateNodeConfig(selectedNode.id, { [propName]: value });
  };

  const resourceUtilization = selectedNode.resourceUtilization ?? 0;
  const customType = selectedNode.customType ?? '';
  const nodeName = selectedNode.name ?? definition.name;

  return (
    <div className="w-full h-full bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-white font-bold text-lg">{nodeName}</h3>
        <p className="text-slate-400 text-xs mt-1">Clase: {definition.name}</p>
        <p className="text-slate-400 text-xs mt-1">ID: {selectedNode.id}</p>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Position properties */}
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <h4 className="text-white font-semibold text-sm mb-3">Posición</h4>
          <div className="space-y-2">
            <div>
              <label className="text-slate-300 text-xs block mb-1">X</label>
              <input
                type="number"
                value={Math.round(selectedNode.x)}
                onChange={() => {
                  // This would require a separate action
                }}
                className="w-full px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600"
                disabled
              />
            </div>
            <div>
              <label className="text-slate-300 text-xs block mb-1">Y</label>
              <input
                type="number"
                value={Math.round(selectedNode.y)}
                onChange={() => {
                  // This would require a separate action
                }}
                className="w-full px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600"
                disabled
              />
            </div>
          </div>
        </div>

        {/* Node Properties */}
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <h4 className="text-white font-semibold text-sm mb-3">Propiedades del Nodo</h4>
          <div className="space-y-3">
            <div>
              <label className="text-slate-300 text-xs block mb-1">Nombre del nodo</label>
              <input
                type="text"
                value={nodeName}
                onChange={(e) => updateNodeName(selectedNode.id, e.target.value)}
                className="w-full px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600 focus:outline-none focus:border-blue-500"
                placeholder="Nombre visible del nodo"
              />
            </div>

            {/* Resource Utilization */}
            <div>
              <label className="text-slate-300 text-xs block mb-1">
                % Utilización de Recurso: <span className="text-blue-300 font-semibold">{resourceUtilization}%</span>
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={resourceUtilization}
                  onChange={(e) =>
                    updateNodeResourceUtilization(selectedNode.id, parseFloat(e.target.value))
                  }
                  className="flex-1 h-2 bg-slate-700 rounded appearance-none cursor-pointer"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={resourceUtilization}
                  onChange={(e) =>
                    updateNodeResourceUtilization(selectedNode.id, parseFloat(e.target.value))
                  }
                  className="w-12 px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              {/* Resource utilization bar */}
              <div className="mt-2 h-2 bg-slate-700 rounded overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    resourceUtilization < 50
                      ? 'bg-green-500'
                      : resourceUtilization < 80
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${resourceUtilization}%` }}
                />
              </div>
            </div>

            {/* Custom Type */}
            <div>
              <label className="text-slate-300 text-xs block mb-1">Tipo de Nodo Personalizado</label>
              <input
                type="text"
                value={customType}
                onChange={(e) =>
                  updateNodeCustomType(selectedNode.id, e.target.value)
                }
                className="w-full px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600 focus:outline-none focus:border-blue-500"
                placeholder="ej: Fuente, Sumidero, Transformador..."
              />
            </div>
          </div>
        </div>

        {/* Configuration properties */}
        {definition.configProperties.length > 0 && (
          <div className="bg-slate-800 rounded p-3 border border-slate-700">
            <h4 className="text-white font-semibold text-sm mb-3">Configuración</h4>
            <div className="space-y-3">
              {definition.configProperties.map((prop) => (
                <div key={prop.name}>
                  <label className="text-slate-300 text-xs block mb-1">
                    {prop.label}
                    {prop.unit && <span className="text-slate-500"> ({prop.unit})</span>}
                  </label>

                  {prop.type === 'number' && (
                    <input
                      type="number"
                      value={Number(selectedNode.config[prop.name] ?? prop.defaultValue)}
                      onChange={(e) =>
                        handleConfigChange(prop.name, parseFloat(e.target.value))
                      }
                      className="w-full px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  )}

                  {prop.type === 'string' && (
                    <input
                      type="text"
                      value={String(selectedNode.config[prop.name] ?? prop.defaultValue)}
                      onChange={(e) =>
                        handleConfigChange(prop.name, e.target.value)
                      }
                      className="w-full px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  )}

                  {prop.type === 'select' && prop.options && (
                    <select
                      value={String(selectedNode.config[prop.name] ?? prop.defaultValue)}
                      onChange={(e) =>
                        handleConfigChange(prop.name, e.target.value)
                      }
                      className="w-full px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600 focus:outline-none focus:border-blue-500"
                    >
                      {prop.options.map((opt) => (
                        <option key={String(opt.value)} value={String(opt.value)}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {prop.type === 'boolean' && (
                    <select
                      value={`${selectedNode.config[prop.name] ?? prop.defaultValue}`}
                      onChange={(e) =>
                        handleConfigChange(prop.name, e.target.value === 'true')
                      }
                      className="w-full px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600 focus:outline-none focus:border-blue-500"
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input connectors info */}
        {definition.inputs.length > 0 && (
          <div className="bg-slate-800 rounded p-3 border border-slate-700">
            <h4 className="text-white font-semibold text-sm mb-2">Entradas</h4>
            <div className="space-y-2">
              {definition.inputs.map((conn) => (
                <div key={conn.id} className="text-xs">
                  <div className="text-blue-300 font-semibold">{conn.name}</div>
                  <div className="text-slate-400 text-xs">
                    Tipo: {conn.valueType}
                  </div>
                  {conn.properties.map((prop) => (
                    <div key={prop.name} className="text-slate-500 text-xs ml-2">
                      • {prop.name} ({prop.unit || 'sin unidad'})
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Output connectors info */}
        {definition.outputs.length > 0 && (
          <div className="bg-slate-800 rounded p-3 border border-slate-700">
            <h4 className="text-white font-semibold text-sm mb-2">Salidas</h4>
            <div className="space-y-2">
              {definition.outputs.map((conn) => (
                <div key={conn.id} className="text-xs">
                  <div className="text-green-300 font-semibold">{conn.name}</div>
                  <div className="text-slate-400 text-xs">
                    Tipo: {conn.valueType}
                  </div>
                  {conn.properties.map((prop) => (
                    <div key={prop.name} className="text-slate-500 text-xs ml-2">
                      • {prop.name} ({prop.unit || 'sin unidad'})
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
