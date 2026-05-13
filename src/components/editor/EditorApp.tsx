'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import Canvas from '@/components/Canvas/Canvas';
import PropertiesPanel from '@/components/Properties/PropertiesPanel';
import NodeLibraryEditor from '@/components/Toolbar/NodeLibraryEditor';
import Toolbar from '@/components/Toolbar/Toolbar';
import { usePyodide } from '@/hooks/usePyodide';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { CanvasState, DiagramRecord, NodeDefinition } from '@/types';

interface EditorAppProps {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    role: 'USER' | 'ADMIN';
  };
}

function diagramRecordToCanvasState(record: DiagramRecord, userId: string): CanvasState {
  return {
    id: record.id,
    userId,
    name: record.name,
    description: record.description ?? undefined,
    nodes: record.nodes,
    connections: record.connections,
    createdAt: new Date(record.createdAt).getTime(),
    updatedAt: new Date(record.updatedAt).getTime(),
  };
}

export default function EditorApp({ user }: EditorAppProps) {
  const [activeView, setActiveView] = useState<'canvas' | 'library'>('canvas');
  const [isSavingDefinitions, setIsSavingDefinitions] = useState(false);
  const [deletingCanvasId, setDeletingCanvasId] = useState<string | null>(null);
  const [savedDiagrams, setSavedDiagrams] = useState<DiagramRecord[]>([]);
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const canvas = useCanvasStore((state) => state.canvas);
  const loadCanvas = useCanvasStore((state) => state.loadCanvas);
  const setNodeDefinitions = useCanvasStore((state) => state.setNodeDefinitions);
  const { runPython } = usePyodide({
    indexURL: process.env.NEXT_PUBLIC_PYODIDE_INDEX_URL,
  });

  const canEditLibrary = user.role === 'ADMIN';

  const formatDate = (timestamp: string) =>
    new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp));

  useEffect(() => {
    const loadDefinitions = async () => {
      try {
        const response = await fetch('/api/blocks');
        if (!response.ok) {
          throw new Error('Failed to load blocks');
        }

        const definitions: NodeDefinition[] = await response.json();
        setNodeDefinitions(definitions);
      } catch (error) {
        console.error('Blocks load error:', error);
        setSaveStatus('Error al cargar bloques');
      }
    };

    void loadDefinitions();
  }, [setNodeDefinitions]);

  const handleSave = async () => {
    try {
      const response = await fetch('/api/diagrams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: canvas.id,
          name: canvas.name,
          description: canvas.description,
          nodes: canvas.nodes,
          connections: canvas.connections,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save diagram');
      }

      const saved = (await response.json()) as DiagramRecord;
      loadCanvas(diagramRecordToCanvasState(saved, user.id));
      setSaveStatus('Proyecto guardado');
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('Error al guardar');
    } finally {
      window.setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  const handleLoad = async () => {
    try {
      const response = await fetch('/api/diagrams');
      if (!response.ok) {
        throw new Error('Failed to load diagrams');
      }

      const diagrams = (await response.json()) as DiagramRecord[];
      setSavedDiagrams(diagrams);
      setIsProjectPickerOpen(true);
    } catch (error) {
      console.error('Load error:', error);
      setSaveStatus('Error al cargar diagramas');
      window.setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  const handleLoadSelectedCanvas = (selectedDiagram: DiagramRecord) => {
    loadCanvas(diagramRecordToCanvasState(selectedDiagram, user.id));
    setIsProjectPickerOpen(false);
    setSavedDiagrams([]);
    setSaveStatus('Proyecto cargado');
    window.setTimeout(() => setSaveStatus(null), 2500);
  };

  const handleDeleteSavedCanvas = async (diagram: DiagramRecord) => {
    const confirmed = window.confirm(
      `¿Eliminar el proyecto "${diagram.name}"? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    setDeletingCanvasId(diagram.id);

    try {
      const response = await fetch(`/api/diagrams/${diagram.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete diagram');
      }

      setSavedDiagrams((current) => current.filter((item) => item.id !== diagram.id));
      setSaveStatus('Proyecto eliminado');
    } catch (error) {
      console.error('Delete error:', error);
      setSaveStatus('Error al eliminar');
    } finally {
      setDeletingCanvasId(null);
      window.setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  const handlePersistDefinitions = async (
    definitions: NodeDefinition[],
    activeDefinition: NodeDefinition,
    deletedId?: string
  ) => {
    setIsSavingDefinitions(true);
    try {
      let response: Response;

      if (deletedId) {
        // Handle deletion
        response = await fetch(`/api/blocks?id=${encodeURIComponent(deletedId)}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        // Handle creation/update
        response = await fetch('/api/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activeDefinition),
        });
      }

      if (!response.ok) {
        throw new Error(deletedId ? 'Failed to delete block' : 'Failed to save blocks');
      }

      const savedDefinitions: NodeDefinition[] = await response.json();
      setNodeDefinitions(savedDefinitions);
      setSaveStatus(deletedId ? 'Nodo eliminado' : 'Biblioteca guardada');
    } catch (error) {
      console.error('Blocks operation error:', error);
      setSaveStatus('Error al procesar biblioteca');
    } finally {
      setIsSavingDefinitions(false);
      window.setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  const topbarTitle = useMemo(
    () => (activeView === 'canvas' ? 'Canvas principal' : 'Biblioteca global'),
    [activeView]
  );

  return (
    <div className="flex h-screen w-screen bg-slate-950">
      <div className="w-72 border-r border-slate-700 shadow-lg">
        <Toolbar
          onSave={handleSave}
          onLoad={handleLoad}
          userId={user.id}
          runPython={runPython}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-slate-700 bg-slate-900 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-white">{topbarTitle}</h2>
            <p className="text-sm text-slate-400">
              {activeView === 'canvas'
                ? 'Diagramas privados por usuario con ejecución secuencial de nodos.'
                : 'Bloques globales compartidos entre todos los usuarios.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {canEditLibrary && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView('canvas')}
                  className={`rounded border px-4 py-2 text-sm transition ${
                    activeView === 'canvas'
                      ? 'border-cyan-400 bg-cyan-500 text-slate-950'
                      : 'border-slate-700 bg-slate-800 text-slate-300'
                  }`}
                >
                  Canvas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('library')}
                  className={`rounded border px-4 py-2 text-sm transition ${
                    activeView === 'library'
                      ? 'border-cyan-400 bg-cyan-500 text-slate-950'
                      : 'border-slate-700 bg-slate-800 text-slate-300'
                  }`}
                >
                  Biblioteca
                </button>
              </div>
            )}

            <div className="text-right">
              <div className="text-sm font-medium text-white">{user.name || user.email}</div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{user.role}</div>
            </div>

            {canEditLibrary && (
              <Link
                href="/admin"
                className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500"
              >
                Admin
              </Link>
            )}

            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: '/login' })}
              className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          {activeView === 'canvas' || !canEditLibrary ? (
            <Canvas />
          ) : (
            <NodeLibraryEditor
              onPersistDefinitions={handlePersistDefinitions}
              isSaving={isSavingDefinitions}
            />
          )}

          {isProjectPickerOpen && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/90 p-6 backdrop-blur-sm">
              <div className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between gap-4 border-b border-slate-700 px-6 py-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Tus diagramas</h3>
                    <p className="text-sm text-slate-400">
                      Solo ves los proyectos que te pertenecen.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsProjectPickerOpen(false)}
                    className="rounded border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {savedDiagrams.length === 0 ? (
                    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 text-sm text-slate-400">
                      No hay diagramas guardados todavía.
                    </div>
                  ) : (
                    savedDiagrams.map((diagram) => (
                      <div
                        key={diagram.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-800 p-4"
                      >
                        <button
                          type="button"
                          onClick={() => handleLoadSelectedCanvas(diagram)}
                          className="flex-1 text-left"
                        >
                          <div className="font-semibold text-white">{diagram.name}</div>
                          <div className="mt-1 text-xs text-slate-400">
                            Actualizado: {formatDate(diagram.updatedAt)}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedCanvas(diagram)}
                          disabled={deletingCanvasId === diagram.id}
                          className="rounded border border-rose-800 px-3 py-2 text-xs text-rose-200 hover:bg-rose-950/40"
                        >
                          {deletingCanvasId === diagram.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {saveStatus && (
            <div className="absolute bottom-4 right-4 z-30 rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-3 text-sm text-white shadow-lg">
              {saveStatus}
            </div>
          )}
        </div>
      </div>

      <div className="w-96 border-l border-slate-700">
        <PropertiesPanel />
      </div>
    </div>
  );
}
