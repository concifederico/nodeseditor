'use client';

import { useEffect, useRef } from 'react';
import { DEFAULT_PYODIDE_INDEX_URL } from '@/lib/constants';

interface RunPythonOptions {
  timeoutMs?: number;
  config?: Record<string, unknown>;
}

interface UsePyodideOptions {
  indexURL?: string;
  packages?: string[];
}

type WorkerMessage =
  | { type: 'init:success' }
  | { type: 'init:error'; error: string }
  | { type: 'run:success'; id: string; output: unknown }
  | { type: 'run:error'; id: string; error: string };

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

let sharedWorker: Worker | null = null;
let initPromise: Promise<void> | null = null;

function createWorker() {
  return new Worker(new URL('../workers/pyodide.worker.ts', import.meta.url), {
    type: 'module',
  });
}

export function usePyodide(options?: UsePyodideOptions) {
  const pendingRef = useRef<Map<string, PendingRequest>>(new Map());

  useEffect(() => {
    if (!sharedWorker) {
      sharedWorker = createWorker();
    }

    const worker = sharedWorker;
    const handleMessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;

      if (message.type === 'run:success') {
        const pending = pendingRef.current.get(message.id);
        if (!pending) return;
        pending.resolve(message.output);
        pendingRef.current.delete(message.id);
      }

      if (message.type === 'run:error') {
        const pending = pendingRef.current.get(message.id);
        if (!pending) return;
        pending.reject(new Error(message.error));
        pendingRef.current.delete(message.id);
      }
    };

    worker.addEventListener('message', handleMessage);

    if (!initPromise) {
      initPromise = new Promise<void>((resolve, reject) => {
        const initListener = (event: MessageEvent<WorkerMessage>) => {
          const message = event.data;

          if (message.type === 'init:success') {
            worker.removeEventListener('message', initListener);
            resolve();
          }

          if (message.type === 'init:error') {
            worker.removeEventListener('message', initListener);
            reject(new Error(message.error));
          }
        };

        worker.addEventListener('message', initListener);
        worker.postMessage({
          type: 'init',
          payload: {
            indexURL: options?.indexURL ?? DEFAULT_PYODIDE_INDEX_URL,
            packages: options?.packages ?? ['numpy'],
          },
        });
      });
    }

    return () => {
      worker.removeEventListener('message', handleMessage);
    };
  }, [options?.indexURL, options?.packages]);

  const runPython = async (
    script: string,
    inputs: Record<string, unknown>,
    options?: RunPythonOptions
  ) => {
    if (!sharedWorker) {
      sharedWorker = createWorker();
    }

    await initPromise;

    const worker = sharedWorker;
    const requestId = crypto.randomUUID();
    const timeoutMs = options?.timeoutMs ?? 4_000;

    return await new Promise<unknown>((resolve, reject) => {
      const timeoutHandle = window.setTimeout(() => {
        pendingRef.current.delete(requestId);
        worker.terminate();
        sharedWorker = null;
        initPromise = null;
        reject(new Error('Tiempo de ejecución agotado para este nodo.'));
      }, timeoutMs);

      pendingRef.current.set(requestId, {
        resolve: (value) => {
          window.clearTimeout(timeoutHandle);
          resolve(value);
        },
        reject: (error) => {
          window.clearTimeout(timeoutHandle);
          reject(error);
        },
      });

      worker.postMessage({
        type: 'run',
        payload: {
          id: requestId,
          script,
          inputs,
          config: options?.config ?? {},
        },
      });
    });
  };

  return { runPython };
}
