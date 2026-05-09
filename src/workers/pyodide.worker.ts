/// <reference lib="webworker" />

import { loadPyodide } from 'pyodide';
import { DEFAULT_PYODIDE_INDEX_URL } from '@/lib/constants';

type PyodideApi = Awaited<ReturnType<typeof loadPyodide>>;

type WorkerInitMessage = {
  type: 'init';
  payload?: {
    indexURL?: string;
    packages?: string[];
  };
};

type WorkerRunMessage = {
  type: 'run';
  payload: {
    id: string;
    script: string;
    inputs: Record<string, unknown>;
    config?: Record<string, unknown>;
  };
};

let initPromise: Promise<PyodideApi> | null = null;

async function ensurePyodide(indexURL?: string, packages: string[] = ['numpy']) {
  if (!initPromise) {
    initPromise = loadPyodide({
      indexURL: indexURL ?? DEFAULT_PYODIDE_INDEX_URL,
    }).then(async (instance) => {
      if (packages.length > 0) {
        await instance.loadPackage(packages);
      }

      return instance;
    });
  }

  return initPromise;
}

async function runScript(
  instance: PyodideApi,
  script: string,
  inputs: Record<string, unknown>,
  config: Record<string, unknown> = {}
) {
  await instance.loadPackagesFromImports(script);

  const globals = instance.globals;
  const pyInputs = instance.toPy(inputs);
  const pyConfig = instance.toPy(config);

  globals.set('__node_inputs__', pyInputs);
  globals.set('__node_config__', pyConfig);
  globals.set('__node_script__', script);

  try {
    const result = await instance.runPythonAsync(`
locals_ns = {"inputs": __node_inputs__, "config": __node_config__}
exec(__node_script__, {}, locals_ns)
if "main" in locals_ns and callable(locals_ns["main"]):
    __node_result__ = locals_ns["main"](__node_inputs__, __node_config__)
elif "result" in locals_ns:
    __node_result__ = locals_ns["result"]
else:
    raise ValueError("El script debe definir 'result' o una función main(inputs, config).")
__node_result__
`);

    return typeof result?.toJs === 'function' ? result.toJs({ dict_converter: Object.fromEntries }) : result;
  } finally {
    pyInputs.destroy?.();
    pyConfig.destroy?.();
    globals.delete('__node_inputs__');
    globals.delete('__node_config__');
    globals.delete('__node_script__');
  }
}

self.onmessage = async (event: MessageEvent<WorkerInitMessage | WorkerRunMessage>) => {
  const message = event.data;

  try {
    if (message.type === 'init') {
      await ensurePyodide(message.payload?.indexURL, message.payload?.packages);
      self.postMessage({ type: 'init:success' });
      return;
    }

    if (message.type === 'run') {
      const instance = await ensurePyodide();
      const output = await runScript(
        instance,
        message.payload.script,
        message.payload.inputs,
        message.payload.config
      );

      self.postMessage({
        type: 'run:success',
        id: message.payload.id,
        output,
      });
    }
  } catch (error) {
    self.postMessage({
      type: message.type === 'run' ? 'run:error' : 'init:error',
      id: message.type === 'run' ? message.payload.id : undefined,
      error: error instanceof Error ? error.message : 'Error desconocido en Pyodide.',
    });
  }
};
