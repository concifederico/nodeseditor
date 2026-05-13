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
  const pyodidePackages = Array.isArray(config.__pyodidePackages__)
    ? config.__pyodidePackages__.filter((value): value is string => typeof value === 'string')
    : [];
  const micropipPackages = Array.isArray(config.__micropipPackages__)
    ? config.__micropipPackages__.filter((value): value is string => typeof value === 'string')
    : [];
  const outputNames = Array.isArray(config.__outputNames__)
    ? config.__outputNames__.filter((value): value is string => typeof value === 'string')
    : [];

  await instance.loadPackagesFromImports(script);
  if (pyodidePackages.length > 0) {
    await instance.loadPackage(pyodidePackages);
  }
  if (micropipPackages.length > 0) {
    await instance.loadPackage(['micropip']);
    const pyMicropipPackages = instance.toPy(micropipPackages);
    instance.globals.set('__micropip_packages__', pyMicropipPackages);
    try {
      await instance.runPythonAsync(`
import micropip
await micropip.install(list(__micropip_packages__))
`);
    } finally {
      pyMicropipPackages.destroy?.();
      instance.globals.delete('__micropip_packages__');
    }
  }

  const globals = instance.globals;
  
  // Convert config string values that look like numbers to actual numbers
  const normalizedConfig: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (
      key === '__pyodidePackages__' ||
      key === '__micropipPackages__' ||
      key === '__outputNames__'
    ) {
      continue;
    }
    if (typeof value === 'string') {
      // Try to parse as number if it looks numeric
      if (/^-?\d+\.?\d*$/.test(value.trim())) {
        normalizedConfig[key] = Number(value);
      } else if (value === 'true' || value === 'false') {
        normalizedConfig[key] = value === 'true';
      } else {
        normalizedConfig[key] = value;
      }
    } else {
      normalizedConfig[key] = value;
    }
  }
  
  const pyInputs = instance.toPy(inputs);
  const pyConfig = instance.toPy(normalizedConfig);
  const pyOutputNames = instance.toPy(outputNames);

  globals.set('__node_inputs__', pyInputs);
  globals.set('__node_config__', pyConfig);
  globals.set('__node_script__', script);
  globals.set('__node_output_names__', pyOutputNames);

  try {
    const result = await instance.runPythonAsync(`
# Preparar namespace local con inputs y config disponibles directamente
locals_ns = {}

# Agregar inputs como variables individuales
if isinstance(__node_inputs__, dict):
    single_input_key = None
    if len(__node_inputs__) == 1:
        single_input_key = next(iter(__node_inputs__.keys()))

    for key, value in __node_inputs__.items():
        locals_ns[key] = value

        # Exponer propiedades internas con nombres directos cuando la entrada es un dict.
        if isinstance(value, dict):
            for nested_key, nested_value in value.items():
                locals_ns[f"{key}_{nested_key}"] = nested_value

                # Si solo hay una entrada y no existe colisión, exponer tambien el nombre corto.
                if single_input_key == key and nested_key not in locals_ns:
                    locals_ns[nested_key] = nested_value

# Agregar config como variables individuales
if isinstance(__node_config__, dict):
    for key, value in __node_config__.items():
        locals_ns[key] = value

# También mantener referencias a inputs y config como objetos
locals_ns["inputs"] = __node_inputs__
locals_ns["config"] = __node_config__

# Ejecutar el script del usuario
exec(__node_script__, locals_ns, locals_ns)

# Determinar qué retornar
if "main" in locals_ns and callable(locals_ns["main"]):
    # Si hay función main, usarla
    __node_result__ = locals_ns["main"](__node_inputs__, __node_config__)
elif "result" in locals_ns:
    # Si hay variable result, usarla
    __node_result__ = locals_ns["result"]
else:
    # Extraer variables definidas por el usuario (que no son funciones ni privadas)
    system_vars = {"inputs", "config", "__node_inputs__", "__node_config__", "__node_script__", "main"}
    user_variables = {}
    
    for key, value in locals_ns.items():
        # Incluir si no es variable de sistema, no comienza con _ y no es callable
        if key not in system_vars and not key.startswith("_") and not callable(value):
            user_variables[key] = value
    
    preferred_outputs = {}
    if isinstance(__node_output_names__, list) and len(__node_output_names__) > 0:
        for output_name in __node_output_names__:
            if output_name in user_variables:
                preferred_outputs[output_name] = user_variables[output_name]

    if preferred_outputs:
        __node_result__ = {"outputs": preferred_outputs}
    elif user_variables:
        # Si hay variables definidas, devolverlas como outputs
        __node_result__ = {"outputs": user_variables}
    else:
        raise ValueError("El script debe definir variables con el nombre de las salidas, o bien 'result', o una función main(inputs, config).")

__node_result__
`);

    return typeof result?.toJs === 'function' ? result.toJs({ dict_converter: Object.fromEntries }) : result;
  } finally {
    pyInputs.destroy?.();
    pyConfig.destroy?.();
    pyOutputNames.destroy?.();
    globals.delete('__node_inputs__');
    globals.delete('__node_config__');
    globals.delete('__node_script__');
    globals.delete('__node_output_names__');
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
