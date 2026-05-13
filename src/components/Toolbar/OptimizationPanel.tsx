'use client';

import { startTransition, useEffect, useMemo, useState } from 'react';
import { Play, SlidersHorizontal, Sparkles } from 'lucide-react';
import { CUSTOM_OPTIMIZATION_TEMPLATE } from '@/lib/optimization/scripts';
import {
  OptimizationFormValues,
  runOptimization,
} from '@/lib/optimization/runOptimization';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { OptimizationMode, OptimizationResult } from '@/types';

interface OptimizationPanelProps {
  userId: string;
  runPython: (
    script: string,
    inputs: Record<string, unknown>,
    options?: { config?: Record<string, unknown>; timeoutMs?: number }
  ) => Promise<unknown>;
}

const MODE_OPTIONS: Array<{ value: OptimizationMode; label: string }> = [
  { value: 'max-throughput', label: 'Maximizar throughput (flujo de salida)' },
  { value: 'min-cycle-time', label: 'Minimizar tiempo de ciclo' },
  { value: 'balance-utilization', label: 'Balancear utilización de nodos' },
  { value: 'custom-script', label: 'Optimización personalizada (script Python)' },
];

function PythonCodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="min-h-[260px] w-full resize-y bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100 outline-none"
      />
    </div>
  );
}

function formatObjective(result: OptimizationResult) {
  const suffix = result.unit ? ` ${result.unit}` : '';
  return `${result.objectiveValue.toFixed(4)}${suffix}`;
}

function summarizeDetailMap(
  value: unknown,
  formatter?: (entryValue: number) => string
): Array<{ key: string; value: string }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => ({
    key,
    value:
      typeof entryValue === 'number'
        ? formatter?.(entryValue) ?? entryValue.toFixed(4)
        : String(entryValue),
  }));
}

type OptimizationDraft = {
  mode: OptimizationMode;
  selectedSinkId: string;
  selectedCriticalNodeId: string;
  wipLimit: string;
  tolerance: string;
  customScript: string;
};

function getStorageKey(userId: string) {
  return `nodeseditor:optimization:${userId}`;
}

function loadStoredDraft(userId: string): Partial<OptimizationDraft> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedValue = window.localStorage.getItem(getStorageKey(userId));
  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue) as Partial<OptimizationDraft>;
  } catch {
    window.localStorage.removeItem(getStorageKey(userId));
    return null;
  }
}

export default function OptimizationPanel({ userId, runPython }: OptimizationPanelProps) {
  const canvas = useCanvasStore((state) => state.canvas);
  const definitions = useCanvasStore((state) => state.nodeDefinitions);
  const applyNodeParameterChanges = useCanvasStore((state) => state.applyNodeParameterChanges);
  const setOptimizedNodeIds = useCanvasStore((state) => state.setOptimizedNodeIds);
  const initialDraft = useMemo(() => loadStoredDraft(userId), [userId]);

  const [mode, setMode] = useState<OptimizationMode>(initialDraft?.mode ?? 'max-throughput');
  const [selectedSinkId, setSelectedSinkId] = useState<string>(initialDraft?.selectedSinkId ?? '');
  const [selectedCriticalNodeId, setSelectedCriticalNodeId] = useState<string>(
    initialDraft?.selectedCriticalNodeId ?? ''
  );
  const [wipLimit, setWipLimit] = useState<string>(initialDraft?.wipLimit ?? '');
  const [tolerance, setTolerance] = useState<string>(initialDraft?.tolerance ?? '0.1');
  const [customScript, setCustomScript] = useState(
    initialDraft?.customScript?.trim() ? initialDraft.customScript : CUSTOM_OPTIMIZATION_TEMPLATE
  );
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  useEffect(() => {
    const draft: OptimizationDraft = {
      mode,
      selectedSinkId,
      selectedCriticalNodeId,
      wipLimit,
      tolerance,
      customScript,
    };

    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(draft));
  }, [customScript, mode, selectedCriticalNodeId, selectedSinkId, tolerance, userId, wipLimit]);

  const sinkNodes = useMemo(
    () =>
      canvas.nodes.filter(
        (node) => !canvas.connections.some((connection) => connection.sourceNodeId === node.id)
      ),
    [canvas.connections, canvas.nodes]
  );

  const effectiveSinkId = useMemo(() => {
    if (selectedSinkId && sinkNodes.some((node) => node.id === selectedSinkId)) {
      return selectedSinkId;
    }
    return sinkNodes[0]?.id ?? '';
  }, [selectedSinkId, sinkNodes]);

  const values: OptimizationFormValues = {
    mode,
    selectedSinkId: effectiveSinkId || undefined,
    selectedCriticalNodeId: selectedCriticalNodeId || undefined,
    wipLimit: wipLimit.trim() === '' ? null : Number(wipLimit),
    tolerance: Number(tolerance) || 0.1,
    targetUtilization: 0.8,
    customScript,
  };

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setOptimizedNodeIds([]);

    try {
      const optimizationResult = await runOptimization({
        nodes: canvas.nodes,
        connections: canvas.connections,
        definitions,
        values,
        runPython,
      });

      startTransition(() => {
        setResult(optimizationResult);
        setOptimizedNodeIds(optimizationResult.affectedNodeIds);
      });
    } catch (runError) {
      setError(
        runError instanceof Error ? runError.message : 'La optimización falló por un error desconocido.'
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleApplyChanges = () => {
    if (!result || result.suggestedChanges.length === 0) {
      return;
    }

    applyNodeParameterChanges(result.suggestedChanges);
    setOptimizedNodeIds(result.affectedNodeIds);
  };

  const sourceRateSummary = summarizeDetailMap(result?.details?.source_rates, (entry) =>
    `${entry.toFixed(3)} u/t`
  );
  const utilizationSummary = summarizeDetailMap(result?.details?.utilizations, (entry) =>
    `${(entry * 100).toFixed(1)}%`
  );
  const cycleTermsSummary = summarizeDetailMap(result?.details?.cycle_terms, (entry) =>
    `${entry.toFixed(3)} u/t`
  );

  return (
    <div className="border-t border-slate-700 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={16} className="text-cyan-300" />
        <h3 className="text-sm font-semibold text-white">Optimización</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-slate-300">Objetivo</label>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as OptimizationMode)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
          >
            {MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {mode === 'max-throughput' && (
          <div>
            <label className="mb-1 block text-xs text-slate-300">Nodo de salida</label>
            <select
              value={effectiveSinkId}
              onChange={(event) => setSelectedSinkId(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            >
              {sinkNodes.length === 0 ? (
                <option value="">Sin sumideros detectados</option>
              ) : (
                sinkNodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name || node.id}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        {mode === 'min-cycle-time' && (
          <>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Nodo crítico opcional</label>
              <select
                value={selectedCriticalNodeId}
                onChange={(event) => setSelectedCriticalNodeId(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
              >
                <option value="">Auto-detectar</option>
                {canvas.nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name || node.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">Límite de WIP</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={wipLimit}
                onChange={(event) => setWipLimit(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>
          </>
        )}

        {mode === 'balance-utilization' && (
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-300">Tolerancia</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={tolerance}
                onChange={(event) => setTolerance(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>
            <p className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-400">
              Objetivo interno: acercar todos los nodos a 80% de utilización. Si `scipy` no está
              disponible en Pyodide, se usa una heurística de respaldo.
            </p>
          </div>
        )}

        {mode === 'custom-script' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs text-slate-300">Script Python</label>
              <button
                type="button"
                onClick={() => setCustomScript(CUSTOM_OPTIMIZATION_TEMPLATE)}
                className="text-xs text-cyan-300 hover:text-cyan-200"
              >
                Restaurar plantilla
              </button>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-300">
              El contenido se guarda automaticamente para este usuario en este navegador.
            </div>
            <PythonCodeEditor value={customScript} onChange={setCustomScript} />
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={isRunning}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:bg-cyan-800 disabled:text-slate-300"
        >
          <Play size={16} />
          {isRunning ? 'Optimizando...' : 'Ejecutar optimización'}
        </button>

        {error && (
          <div className="rounded-xl border border-rose-900 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-white">
                  <SlidersHorizontal size={15} className="text-cyan-300" />
                  <span className="text-sm font-semibold">{result.objectiveLabel}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{result.message || 'Sin mensaje adicional.'}</p>
              </div>
              <div className="rounded-xl border border-cyan-900 bg-cyan-950/50 px-3 py-2 text-right">
                <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">Óptimo</div>
                <div className="text-sm font-semibold text-white">{formatObjective(result)}</div>
              </div>
            </div>

            {result.bottleneckNodeIds && result.bottleneckNodeIds.length > 0 && (
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Cuellos de botella
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.bottleneckNodeIds.map((nodeId) => (
                    <span
                      key={nodeId}
                      className="rounded-full border border-amber-700 bg-amber-950/40 px-2 py-1 text-xs text-amber-200"
                    >
                      {canvas.nodes.find((node) => node.id === nodeId)?.name || nodeId}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {sourceRateSummary.length > 0 && (
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Tasas sugeridas
                </div>
                <div className="space-y-1 text-xs text-slate-200">
                  {sourceRateSummary.map((entry) => (
                    <div key={entry.key} className="flex items-center justify-between gap-2">
                      <span>{canvas.nodes.find((node) => node.id === entry.key)?.name || entry.key}</span>
                      <span className="text-cyan-300">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {utilizationSummary.length > 0 && (
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Utilización estimada
                </div>
                <div className="grid gap-1 text-xs text-slate-200">
                  {utilizationSummary.map((entry) => (
                    <div key={entry.key} className="flex items-center justify-between gap-2">
                      <span>{canvas.nodes.find((node) => node.id === entry.key)?.name || entry.key}</span>
                      <span>{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cycleTermsSummary.length > 0 && (
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Contribución por nodo
                </div>
                <div className="grid gap-1 text-xs text-slate-200">
                  {cycleTermsSummary.map((entry) => (
                    <div key={entry.key} className="flex items-center justify-between gap-2">
                      <span>{canvas.nodes.find((node) => node.id === entry.key)?.name || entry.key}</span>
                      <span>{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.suggestedChanges.length > 0 && (
              <button
                type="button"
                onClick={handleApplyChanges}
                className="w-full rounded-xl border border-cyan-700 bg-cyan-950/40 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-900/40"
              >
                Aplicar cambios al canvas
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
