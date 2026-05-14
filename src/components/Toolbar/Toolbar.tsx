'use client';

import React, { useState } from 'react';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { Save, Trash2, FolderOpen, Play } from 'lucide-react';
import OptimizationPanel from '@/components/Toolbar/OptimizationPanel';
import { executeGraphSequentially } from '@/lib/simulation/executeGraph';

interface ToolbarProps {
  onSave: () => void;
  onLoad: () => void;
  userId: string;
  runPython: (
    script: string,
    inputs: Record<string, unknown>,
    options?: { config?: Record<string, unknown>; timeoutMs?: number }
  ) => Promise<unknown>;
}

export default function Toolbar({
  onSave,
  onLoad,
  userId,
  runPython,
}: ToolbarProps) {
  const addNode = useCanvasStore((state) => state.addNode);
  const clearCanvas = useCanvasStore((state) => state.clearCanvas);
  const setCanvasName = useCanvasStore((state) => state.setCanvasName);
  const canvas = useCanvasStore((state) => state.canvas);
  const nodeDefinitions = useCanvasStore((state) => state.nodeDefinitions);
  const setDraggedNodeDef = useCanvasStore((state) => state.setDraggedNodeDef);
  const draggedNodeDef = useCanvasStore((state) => state.ui.draggedNodeDefId);
  const updateNodeResourceUtilization = useCanvasStore((state) => state.updateNodeResourceUtilization);
  const updateNodeExecutionResult = useCanvasStore((state) => state.updateNodeExecutionResult);
  const [isRunningSim, setIsRunningSim] = useState(false);

  const handleDragStart = (definitionId: string) => {
    setDraggedNodeDef(definitionId);
  };

  const handleDragEnd = () => {
    setDraggedNodeDef(null);
  };

  const handleAddNodeClick = (definitionId: string) => {
    addNode(definitionId, 120, 120);
  };

  const handleRunSimulation = async () => {
    if (canvas.nodes.length === 0) return;
    setIsRunningSim(true);
    try {
      await executeGraphSequentially({
        nodes: canvas.nodes,
        connections: canvas.connections,
        definitions: nodeDefinitions,
        runPythonScript: runPython,
        onNodeUtilizationUpdate: (nodeId, utilization) => {
          updateNodeResourceUtilization(nodeId, utilization);
        },
        onNodeComplete: (result) => {
          updateNodeExecutionResult(result.nodeId, {
            output: result.output,
            outputByConnector: result.outputByConnector,
          });
        },
      });
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsRunningSim(false);
    }
  };

  return (
    <div className="w-full h-full bg-slate-900 border-r border-slate-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-white font-bold text-lg mb-2">Editor de Nodos</h2>
        <input
          type="text"
          value={canvas.name}
          onChange={(e) => setCanvasName(e.target.value)}
          className="w-full px-2 py-1 bg-slate-800 text-white rounded text-sm border border-slate-600 focus:outline-none focus:border-blue-500"
          placeholder="Nombre del proyecto"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 p-4 border-b border-slate-700">
        <button
          onClick={onSave}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
          title="Guardar proyecto"
        >
          <Save size={16} />
          Guardar
        </button>
        <button
          onClick={onLoad}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition"
          title="Cargar proyecto"
        >
          <FolderOpen size={16} />
          Cargar
        </button>
        <button
          onClick={clearCanvas}
          className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition"
          title="Limpiar lienzo"
        >
          <Trash2 size={16} />
          Limpiar
        </button>
        <button
          onClick={() => void handleRunSimulation()}
          disabled={isRunningSim || canvas.nodes.length === 0}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Ejecutar simulación de todos los nodos"
        >
          <Play size={16} />
          {isRunningSim ? 'Simulando...' : 'Simular'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="mb-3 text-sm font-bold text-white">Componentes</h3>
          <div className="space-y-2">
            {nodeDefinitions.map((def) => {
              return (
                <div
                  key={def.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', def.id);
                    e.dataTransfer.effectAllowed = 'copy';
                    handleDragStart(def.id);
                  }}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleAddNodeClick(def.id)}
                  className={`p-3 rounded cursor-move transition ${
                    draggedNodeDef === def.id
                      ? 'bg-blue-500 opacity-50'
                      : 'bg-slate-800 hover:bg-slate-700'
                  } border border-slate-600 hover:border-blue-500`}
                >
                  <div className="text-white text-sm font-semibold">{def.name}</div>
                  <div className="text-slate-400 text-xs mt-1">{def.description}</div>
                  <div className="text-slate-500 text-xs mt-2">
                    📥 {def.inputs.length} entrada{def.inputs.length !== 1 ? 's' : ''} | 📤{' '}
                    {def.outputs.length} salida{def.outputs.length !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <OptimizationPanel userId={userId} runPython={runPython} />
      </div>

      {/* Info footer */}
      <div className="p-4 bg-slate-800 text-slate-400 text-xs border-t border-slate-700">
        <p className="mb-1">➕ Click para agregar al lienzo</p>
        <p className="mb-1">💡 Arrastre componentes al lienzo</p>
        <p className="mb-1">🔗 Arrastra entre conectores para unir</p>
        <p>🗑️ Click en nodo para seleccionar/eliminar</p>
      </div>
    </div>
  );
}
