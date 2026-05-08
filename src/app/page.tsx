'use client';

import { useState, useEffect } from 'react';
import Canvas from '@/components/Canvas/Canvas';
import Toolbar from '@/components/Toolbar/Toolbar';
import NodeLibraryEditor from '@/components/Toolbar/NodeLibraryEditor';
import PropertiesPanel from '@/components/Properties/PropertiesPanel';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { CanvasState, NodeDefinition } from '@/types';

export default function Home() {
  const [activeView, setActiveView] = useState<'canvas' | 'library'>('canvas');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDefinitions, setIsSavingDefinitions] = useState(false);
  const [deletingCanvasId, setDeletingCanvasId] = useState<string | null>(null);
  const [savedCanvases, setSavedCanvases] = useState<CanvasState[]>([]);
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const canvas = useCanvasStore((state) => state.canvas);
  const loadCanvas = useCanvasStore((state) => state.loadCanvas);
  const setNodeDefinitions = useCanvasStore((state) => state.setNodeDefinitions);

  const formatDate = (timestamp: number) =>
    new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp));

  useEffect(() => {
    const loadDefinitions = async () => {
      try {
        const response = await fetch('/api/node-definitions');
        if (!response.ok) {
          throw new Error('Failed to load node definitions');
        }

        const definitions: NodeDefinition[] = await response.json();
        setNodeDefinitions(definitions);
      } catch (error) {
        console.error('Definitions load error:', error);
        setSaveStatus('✗ Error al cargar biblioteca');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    };

    void loadDefinitions();
  }, [setNodeDefinitions]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(canvas),
      });

      if (response.ok) {
        setSaveStatus('✓ Proyecto guardado');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('✗ Error al guardar');
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('✗ Error al guardar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/canvas');
      if (response.ok) {
        const canvases: CanvasState[] = await response.json();
        const sorted = canvases.sort((a, b) => b.updatedAt - a.updatedAt);
        setSavedCanvases(sorted);
        setIsProjectPickerOpen(true);
      } else {
        setSaveStatus('✗ Error al cargar proyectos');
      }
    } catch (error) {
      console.error('Load error:', error);
      setSaveStatus('✗ Error al cargar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSelectedCanvas = (selectedCanvas: CanvasState) => {
    loadCanvas(selectedCanvas);
    setIsProjectPickerOpen(false);
    setSavedCanvases([]);
    setSaveStatus('✓ Proyecto cargado');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleDeleteSavedCanvas = async (canvasToDelete: CanvasState) => {
    const confirmed = window.confirm(
      `¿Eliminar el proyecto "${canvasToDelete.name}"? Esta acción no se puede deshacer.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingCanvasId(canvasToDelete.id);

    try {
      const response = await fetch(`/api/canvas?id=${canvasToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete canvas');
      }

      setSavedCanvases((current) =>
        current.filter((savedCanvas) => savedCanvas.id !== canvasToDelete.id)
      );
      setSaveStatus('✓ Proyecto eliminado');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Delete error:', error);
      setSaveStatus('✗ Error al eliminar proyecto');
    } finally {
      setDeletingCanvasId(null);
    }
  };

  const handlePersistDefinitions = async (definitions: NodeDefinition[]) => {
    setIsSavingDefinitions(true);
    try {
      const response = await fetch('/api/node-definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(definitions),
      });

      if (!response.ok) {
        throw new Error('Failed to save node definitions');
      }

      const savedDefinitions: NodeDefinition[] = await response.json();
      setNodeDefinitions(savedDefinitions);
      setSaveStatus('✓ Biblioteca guardada');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Definitions save error:', error);
      setSaveStatus('✗ Error al guardar biblioteca');
    } finally {
      setIsSavingDefinitions(false);
    }
  };

  return (
    <div className="flex w-screen h-screen bg-slate-950">
      {/* Toolbar */}
      <div className="w-64 border-r border-slate-700 shadow-lg">
        <Toolbar onSave={handleSave} onLoad={handleLoad} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-slate-700 bg-slate-900 px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-white font-semibold text-lg">
              {activeView === 'canvas' ? 'Canvas principal' : 'Editor de biblioteca'}
            </h2>
            <p className="text-slate-400 text-sm">
              {activeView === 'canvas'
                ? 'Arrastra componentes y conecta nodos en el proyecto actual.'
                : 'Crea y edita tipos de nodo reutilizables para futuros canvas.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveView('canvas')}
              className={`px-4 py-2 rounded text-sm border transition ${
                activeView === 'canvas'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              Canvas
            </button>
            <button
              type="button"
              onClick={() => setActiveView('library')}
              className={`px-4 py-2 rounded text-sm border transition ${
                activeView === 'library'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              Biblioteca
            </button>
          </div>
        </div>

        <div className="flex-1 relative canvas-container min-h-0">
          {activeView === 'canvas' ? (
            <Canvas />
          ) : (
            <NodeLibraryEditor
              onPersistDefinitions={handlePersistDefinitions}
              isSaving={isSavingDefinitions}
            />
          )}

          {isProjectPickerOpen && (
            <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="w-full max-w-3xl max-h-[80vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-white font-semibold text-lg">Proyectos guardados</h3>
                    <p className="text-slate-400 text-sm">
                      Selecciona qué proyecto quieres cargar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsProjectPickerOpen(false)}
                    className="px-3 py-2 rounded text-sm border border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {savedCanvases.length === 0 ? (
                    <div className="text-slate-400 text-sm p-4 border border-slate-700 rounded-lg bg-slate-800">
                      No hay proyectos guardados todavía.
                    </div>
                  ) : (
                    savedCanvases.map((savedCanvas) => (
                      <div
                        key={savedCanvas.id}
                        className="p-4 rounded-lg border border-slate-700 bg-slate-800"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <button
                            type="button"
                            onClick={() => handleLoadSelectedCanvas(savedCanvas)}
                            className="flex-1 text-left hover:opacity-90 transition"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="text-white font-semibold">{savedCanvas.name}</div>
                                {savedCanvas.description && (
                                  <div className="text-slate-400 text-sm mt-1">
                                    {savedCanvas.description}
                                  </div>
                                )}
                              </div>
                              <div className="text-right text-xs text-slate-400 shrink-0">
                                <div>Actualizado: {formatDate(savedCanvas.updatedAt)}</div>
                                <div>Creado: {formatDate(savedCanvas.createdAt)}</div>
                              </div>
                            </div>
                            <div className="mt-3 text-xs text-slate-400">
                              {savedCanvas.nodes.length} nodo
                              {savedCanvas.nodes.length !== 1 ? 's' : ''} |{' '}
                              {savedCanvas.connections.length} conexión
                              {savedCanvas.connections.length !== 1 ? 'es' : ''}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDeleteSavedCanvas(savedCanvas)}
                            disabled={deletingCanvasId === savedCanvas.id}
                            className="px-3 py-2 rounded text-sm border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                          >
                            {deletingCanvasId === savedCanvas.id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Save status indicator */}
          {saveStatus && (
            <div className="absolute bottom-4 right-4 bg-slate-800 border border-slate-600 text-white px-4 py-2 rounded z-10">
              {saveStatus}
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
              <div className="text-white">Cargando...</div>
            </div>
          )}
        </div>
      </div>

      {/* Properties panel */}
      <div className="w-64 border-l border-slate-700 shadow-lg">
        <PropertiesPanel />
      </div>
    </div>
  );
}
