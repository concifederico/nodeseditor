const PY_RUNTIME = String.raw`
from collections import defaultdict, deque
from copy import deepcopy
import math

graph_data = inputs if isinstance(inputs, dict) else {}
nodes = deepcopy(list(graph_data.get("nodes", [])))
edges = deepcopy(list(graph_data.get("edges", [])))
definitions = {item["id"]: item for item in graph_data.get("definitions", []) if isinstance(item, dict) and item.get("id")}
selected_sink_id = graph_data.get("selectedSinkId")
selected_critical_node_id = graph_data.get("selectedCriticalNodeId")
tolerance = float(graph_data.get("tolerance", 0.1) or 0.1)
wip_limit = graph_data.get("wipLimit")
target_utilization = float(graph_data.get("targetUtilization", 0.8) or 0.8)

node_by_id = {node["id"]: node for node in nodes if isinstance(node, dict) and node.get("id")}
incoming = defaultdict(list)
outgoing = defaultdict(list)

for edge in edges:
    source_id = edge.get("from") or edge.get("sourceNodeId")
    target_id = edge.get("to") or edge.get("targetNodeId")
    if not source_id or not target_id:
        continue
    normalized = {
        "from": source_id,
        "to": target_id,
        "sourceConnectorId": edge.get("sourceConnectorId"),
        "targetConnectorId": edge.get("targetConnectorId"),
    }
    outgoing[source_id].append(normalized)
    incoming[target_id].append(normalized)

def as_float(value, default=0.0):
    try:
        if value is None or value == "":
            return float(default)
        return float(value)
    except (TypeError, ValueError):
        return float(default)

def find_existing_param_name(node_id, preferred_name="input_rate"):
    node = node_by_id.get(node_id)
    if not node:
        return preferred_name

    config = node.get("config") or {}
    for candidate in [preferred_name, "input_rate", "rate", "throughput", "arrival_rate", "feed_rate", "demand"]:
        if candidate in config:
            return candidate
    return preferred_name

def infer_capacity(node):
    config = node.get("config") or {}
    candidates = [
        config.get("max_capacity"),
        config.get("maxCapacity"),
        config.get("capacity"),
        config.get("service_rate"),
        config.get("throughput_limit"),
        node.get("max_capacity"),
        node.get("maxCapacity"),
    ]
    for value in candidates:
        numeric = as_float(value, 0.0)
        if numeric > 0:
            return numeric
    return 0.0

def get_node_parameter(node_id, param_name):
    node = node_by_id.get(node_id)
    if not node:
        return None
    if param_name in node:
        return node.get(param_name)
    return (node.get("config") or {}).get(param_name)

def set_node_parameter(node_id, param_name, value):
    node = node_by_id.get(node_id)
    if not node:
        raise ValueError(f"Nodo no encontrado: {node_id}")
    config = node.setdefault("config", {})
    config[param_name] = value
    return value

def get_source_nodes():
    return [node for node in nodes if len(incoming.get(node["id"], [])) == 0]

def get_sink_nodes():
    return [node for node in nodes if len(outgoing.get(node["id"], [])) == 0]

def compute_topological_order():
    indegree = {node["id"]: len(incoming.get(node["id"], [])) for node in nodes}
    queue = deque([node_id for node_id, value in indegree.items() if value == 0])
    ordered = []

    while queue:
        node_id = queue.popleft()
        ordered.append(node_id)
        for edge in outgoing.get(node_id, []):
            target_id = edge["to"]
            indegree[target_id] -= 1
            if indegree[target_id] == 0:
                queue.append(target_id)

    if len(ordered) != len(nodes):
        raise ValueError("El grafo contiene ciclos y no puede optimizarse.")

    return ordered

def extract_numeric_output(value):
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, dict):
        for key in ("throughput", "flow", "output", "value"):
            nested = value.get(key)
            if isinstance(nested, (int, float)):
                return float(nested)
        outputs = value.get("outputs")
        if isinstance(outputs, dict):
            for nested in outputs.values():
                numeric = extract_numeric_output(nested)
                if numeric is not None:
                    return numeric
    return None

def execute_node_script(node, node_inputs):
    script = node.get("script") or "result = inputs"
    locals_ns = {}

    if isinstance(node_inputs, dict):
        for key, value in node_inputs.items():
            locals_ns[key] = value

    node_config = deepcopy(node.get("config") or {})
    locals_ns["inputs"] = node_inputs
    locals_ns["config"] = node_config

    exec(script, {}, locals_ns)

    if "main" in locals_ns and callable(locals_ns["main"]):
        return locals_ns["main"](node_inputs, node_config)
    if "result" in locals_ns:
        return locals_ns["result"]

    user_variables = {}
    for key, value in locals_ns.items():
        if key.startswith("_") or key in {"inputs", "config", "main"} or callable(value):
            continue
        user_variables[key] = value

    if user_variables:
        return {"outputs": user_variables}

    raise ValueError(f"El script del nodo {node.get('id')} no produjo resultados.")

def run_simulation():
    ordered_ids = compute_topological_order()
    results = {}

    for node_id in ordered_ids:
        connector_inputs = {}
        for edge in incoming.get(node_id, []):
            upstream = results.get(edge["from"])
            connector_value = None

            if isinstance(upstream, dict) and isinstance(upstream.get("outputs"), dict):
                connector_value = upstream["outputs"].get(edge.get("sourceConnectorId")) if edge.get("sourceConnectorId") else None
                if connector_value is None:
                    output_values = list(upstream["outputs"].values())
                    connector_value = output_values[0] if output_values else upstream
            else:
                connector_value = upstream

            target_key = edge.get("targetConnectorId") or edge["from"]
            connector_inputs[target_key] = connector_value

        results[node_id] = execute_node_script(node_by_id[node_id], connector_inputs)

    return results

def get_throughput(sink_node_id=None):
    simulation_results = run_simulation()
    sinks = get_sink_nodes()
    if sink_node_id:
        sinks = [node_by_id[sink_node_id]] if sink_node_id in node_by_id else []
    if not sinks:
        return 0.0

    total = 0.0
    for sink in sinks:
        numeric = extract_numeric_output(simulation_results.get(sink["id"]))
        if numeric is not None:
            total += numeric
    return total

def build_node_capacity_network(active_sink_ids=None):
    if active_sink_ids is None:
        active_sink_ids = [node["id"] for node in get_sink_nodes()]

    capacities = {}
    adjacency = defaultdict(set)

    def add_edge(start, end, capacity):
        capacities[(start, end)] = capacities.get((start, end), 0.0) + float(capacity)
        adjacency[start].add(end)
        adjacency[end].add(start)

    super_source = "__super_source__"
    super_sink = "__super_sink__"
    infinite_capacity = 10**9

    for node in nodes:
        node_id = node["id"]
        node_in = f"{node_id}::in"
        node_out = f"{node_id}::out"
        capacity = infer_capacity(node)
        if capacity <= 0:
            raise ValueError(f"El nodo {node_id} no tiene max_capacity válido.")
        add_edge(node_in, node_out, capacity)

    for edge in edges:
        source_id = edge.get("from") or edge.get("sourceNodeId")
        target_id = edge.get("to") or edge.get("targetNodeId")
        if source_id and target_id:
            add_edge(f"{source_id}::out", f"{target_id}::in", infinite_capacity)

    for source in get_source_nodes():
        add_edge(super_source, f"{source['id']}::in", infinite_capacity)

    for sink_id in active_sink_ids:
        add_edge(f"{sink_id}::out", super_sink, infinite_capacity)

    return capacities, adjacency, super_source, super_sink

def edmonds_karp(capacities, adjacency, source, sink):
    flow = defaultdict(float)
    max_flow = 0.0

    while True:
        parent = {source: None}
        queue = deque([source])

        while queue and sink not in parent:
            current = queue.popleft()
            for neighbor in adjacency[current]:
                residual = capacities.get((current, neighbor), 0.0) - flow[(current, neighbor)]
                if residual > 1e-9 and neighbor not in parent:
                    parent[neighbor] = current
                    queue.append(neighbor)

        if sink not in parent:
            break

        path_capacity = float("inf")
        cursor = sink
        while cursor != source:
            previous = parent[cursor]
            residual = capacities.get((previous, cursor), 0.0) - flow[(previous, cursor)]
            path_capacity = min(path_capacity, residual)
            cursor = previous

        cursor = sink
        while cursor != source:
            previous = parent[cursor]
            flow[(previous, cursor)] += path_capacity
            flow[(cursor, previous)] -= path_capacity
            cursor = previous

        max_flow += path_capacity

    return max_flow, flow

def compute_max_flow(active_sink_ids=None):
    capacities, adjacency, source, sink = build_node_capacity_network(active_sink_ids)
    total_flow, flow = edmonds_karp(capacities, adjacency, source, sink)

    node_flows = {}
    bottlenecks = []
    for node in nodes:
        node_id = node["id"]
        used_capacity = max(flow[(f"{node_id}::in", f"{node_id}::out")], 0.0)
        node_flows[node_id] = used_capacity
        capacity = infer_capacity(node)
        if capacity > 0 and abs(used_capacity - capacity) <= max(1e-6, capacity * 1e-4):
            bottlenecks.append(node_id)

    source_allocations = {}
    for node in get_source_nodes():
        source_allocations[node["id"]] = max(flow[("__super_source__", f"{node['id']}::in")], 0.0)

    return {
        "max_flow": total_flow,
        "node_flows": node_flows,
        "bottlenecks": bottlenecks,
        "source_allocations": source_allocations,
    }

def propagate_source_rates(source_rates):
    ordered = compute_topological_order()
    flow_by_node = defaultdict(float)

    for node in get_source_nodes():
        flow_by_node[node["id"]] += max(as_float(source_rates.get(node["id"]), 0.0), 0.0)

    for node_id in ordered:
        outgoing_edges = outgoing.get(node_id, [])
        if not outgoing_edges:
            continue
        share = flow_by_node[node_id] / len(outgoing_edges) if outgoing_edges else 0.0
        for edge in outgoing_edges:
            flow_by_node[edge["to"]] += share

    return dict(flow_by_node)

def build_parameter_changes(rate_map):
    changes = []
    for node_id, value in rate_map.items():
        changes.append({
            "nodeId": node_id,
            "paramName": find_existing_param_name(node_id, "input_rate"),
            "value": float(value),
        })
    return changes

source_nodes = get_source_nodes()
sink_nodes = get_sink_nodes()
source_ids = [node["id"] for node in source_nodes]
sink_ids = [node["id"] for node in sink_nodes]
nodes_by_id = node_by_id
selected_sink = nodes_by_id.get(selected_sink_id) if selected_sink_id else (sink_nodes[0] if sink_nodes else None)
critical_node = nodes_by_id.get(selected_critical_node_id) if selected_critical_node_id else None
max_capacity_by_node = {node["id"]: infer_capacity(node) for node in nodes}
rate_parameter_by_node = {
    node["id"]: find_existing_param_name(node["id"], "input_rate")
    for node in source_nodes
}
current_rate_by_node = {
    node_id: as_float(get_node_parameter(node_id, param_name), 0.0)
    for node_id, param_name in rate_parameter_by_node.items()
}

def set_rate(node_id, value):
    param_name = rate_parameter_by_node.get(node_id) or find_existing_param_name(node_id, "input_rate")
    rate_parameter_by_node[node_id] = param_name
    return set_node_parameter(node_id, param_name, value)
`;

const MAX_THROUGHPUT_BODY = String.raw`
active_sink_ids = [selected_sink["id"]] if selected_sink else sink_ids
if not active_sink_ids:
    raise ValueError("No hay nodo sumidero disponible para maximizar throughput.")

max_flow_result = compute_max_flow(active_sink_ids)
source_changes = build_parameter_changes(max_flow_result["source_allocations"])

result = {
    "objective_value": float(max_flow_result["max_flow"]),
    "unit": "items/u.t.",
    "message": "Throughput máximo alcanzable respetando max_capacity.",
    "bottleneck_node_ids": max_flow_result["bottlenecks"],
    "affected_node_ids": list(dict.fromkeys(list(max_flow_result["bottlenecks"]) + list(max_flow_result["source_allocations"].keys()))),
    "optimal_parameters": source_changes,
    "details": {
        "source_rates": max_flow_result["source_allocations"],
        "node_flows": max_flow_result["node_flows"],
        "sink_ids": active_sink_ids,
    },
}
`;

const MIN_CYCLE_TIME_BODY = String.raw`
active_sink_ids = [selected_sink["id"]] if selected_sink else sink_ids
if not active_sink_ids:
    raise ValueError("No hay nodo sumidero para calcular el tiempo de ciclo.")

max_flow_result = compute_max_flow(active_sink_ids)
lambda_value = float(max_flow_result["max_flow"])

if wip_limit is not None and str(wip_limit).strip() != "":
    lambda_value = min(lambda_value, as_float(wip_limit, lambda_value))

if lambda_value <= 0:
    raise ValueError("El throughput calculado es cero; no se puede estimar tiempo de ciclo.")

cycle_terms = {}
critical_nodes = []
total_cycle_time = 0.0

for node in nodes:
    mu = infer_capacity(node)
    if mu <= lambda_value:
        critical_nodes.append(node["id"])
        continue
    node_cycle = 1.0 / (mu - lambda_value)
    cycle_terms[node["id"]] = node_cycle
    total_cycle_time += node_cycle

if critical_nodes:
    raise ValueError("El throughput propuesto satura al menos un nodo y hace infinito el tiempo de ciclo: " + ", ".join(critical_nodes))

source_rates = max_flow_result["source_allocations"]
if source_rates and max_flow_result["max_flow"] > 0 and lambda_value != max_flow_result["max_flow"]:
    scale = lambda_value / max_flow_result["max_flow"]
    source_rates = {node_id: rate * scale for node_id, rate in source_rates.items()}

message = "Tiempo de ciclo estimado con modelo M/M/1 sobre el throughput sugerido."
if critical_node:
    message += f" Nodo crítico observado: {critical_node['id']}."

result = {
    "objective_value": float(total_cycle_time),
    "unit": "u.t.",
    "message": message,
    "bottleneck_node_ids": max_flow_result["bottlenecks"],
    "affected_node_ids": list(dict.fromkeys(list(cycle_terms.keys()) + list(source_rates.keys()))),
    "optimal_parameters": build_parameter_changes(source_rates),
    "details": {
        "lambda": lambda_value,
        "cycle_terms": cycle_terms,
        "bottleneck_node_ids": max_flow_result["bottlenecks"],
    },
}
`;

const BALANCE_UTILIZATION_BODY = String.raw`
if not source_nodes:
    raise ValueError("Se requiere al menos un nodo fuente para balancear utilización.")

capacity_by_node = max_capacity_by_node
if any(value <= 0 for value in capacity_by_node.values()):
    invalid = [node_id for node_id, value in capacity_by_node.items() if value <= 0]
    raise ValueError("Hay nodos sin max_capacity válido: " + ", ".join(invalid))

def compute_utilizations(rate_map):
    flows = propagate_source_rates(rate_map)
    return {
        node["id"]: (flows.get(node["id"], 0.0) / capacity_by_node[node["id"]]) if capacity_by_node[node["id"]] > 0 else 0.0
        for node in nodes
    }, flows

def heuristic_balance():
    feasible_total = min(capacity_by_node[node["id"]] for node in nodes)
    per_source = (feasible_total * target_utilization) / max(len(source_ids), 1)
    rate_map = {
        source_id: max(0.0, min(per_source, capacity_by_node[source_id] * max(target_utilization, 0.1)))
        for source_id in source_ids
    }
    return rate_map

rate_map = None
solver_used = "heuristic"

try:
    import numpy as np
    from scipy.optimize import minimize

    x0 = np.array([max(0.1, capacity_by_node[source_id] * min(target_utilization, 0.8)) for source_id in source_ids], dtype=float)
    bounds = [(0.0, max(capacity_by_node[source_id], 0.1)) for source_id in source_ids]

    def objective(values):
        current_map = {source_ids[idx]: float(values[idx]) for idx in range(len(source_ids))}
        utilizations, _flows = compute_utilizations(current_map)
        penalty = 0.0
        score = 0.0
        for node_id, utilization in utilizations.items():
            score += (utilization - target_utilization) ** 2
            if utilization > 1.0:
                penalty += (utilization - 1.0) ** 2 * 1000.0
        return score + penalty

    optimization = minimize(objective, x0, bounds=bounds, method="SLSQP")
    optimized_values = optimization.x if getattr(optimization, "success", False) else x0
    rate_map = {source_ids[idx]: float(optimized_values[idx]) for idx in range(len(source_ids))}
    solver_used = "scipy.optimize.minimize"
except Exception:
    rate_map = heuristic_balance()

utilizations, flows = compute_utilizations(rate_map)
imbalanced_nodes = [node_id for node_id, utilization in utilizations.items() if abs(utilization - target_utilization) > tolerance]

result = {
    "objective_value": float(max(abs(utilization - target_utilization) for utilization in utilizations.values()) if utilizations else 0.0),
    "unit": "desviación",
    "message": f"Balance de carga calculado con {solver_used}. Objetivo base: {round(target_utilization * 100)}% de utilización.",
    "bottleneck_node_ids": [node_id for node_id, utilization in utilizations.items() if utilization >= 1.0 - tolerance],
    "affected_node_ids": list(dict.fromkeys(source_ids + imbalanced_nodes)),
    "optimal_parameters": build_parameter_changes(rate_map),
    "details": {
        "source_rates": rate_map,
        "utilizations": utilizations,
        "flows": flows,
        "target_utilization": target_utilization,
        "tolerance": tolerance,
    },
}
`;

export const CUSTOM_OPTIMIZATION_TEMPLATE = String.raw`# Optimizacion personalizada del sistema
#
# Este script se ejecuta dentro del optimizador y puede leer/modificar
# parametros de nodos sin tocar manualmente los scripts del grafo.
#
# Objetivo del ejemplo:
# 1. Detectar los nodos fuente.
# 2. Aumentar 5% su tasa de entrada actual.
# 3. Devolver una propuesta de cambios para aplicar desde la UI.
#
# Variables y helpers disponibles:
# - nodes: lista de nodos del grafo
# - edges: lista de aristas con claves "from" y "to"
# Variables directas ya preparadas:
# - source_nodes, sink_nodes
# - source_ids, sink_ids
# - nodes_by_id
# - selected_sink
# - critical_node
# - max_capacity_by_node
# - current_rate_by_node
# - rate_parameter_by_node
#
# Helpers:
# - run_simulation()
# - get_throughput(sink_node_id=None)
# - set_rate(node_id, value)
# - set_node_parameter(node_id, param_name, value)
# - as_float(value, default=0.0)
#
# Debes devolver un dict llamado "result" con:
# - objective_value: numero
# - optimal_parameters: lista de cambios [{"nodeId", "paramName", "value"}]
# Opcionales:
# - message
# - affected_node_ids
# - bottleneck_node_ids
# - details

if not source_nodes:
    raise ValueError("No hay nodos fuente para optimizar.")

changes = []
for node in source_nodes:
    node_id = node["id"]
    param_name = rate_parameter_by_node[node_id]
    current_value = current_rate_by_node.get(node_id, 1.0)
    suggested_value = round(current_value * 1.05, 4)
    changes.append({
        "nodeId": node_id,
        "paramName": param_name,
        "value": suggested_value,
    })

baseline_throughput = get_throughput(selected_sink["id"] if selected_sink else None)

result = {
    "objective_value": baseline_throughput,
    "optimal_parameters": changes,
    "message": "Plantilla inicial: aumenta 5% la tasa de cada nodo fuente.",
    "affected_node_ids": [change["nodeId"] for change in changes],
    "details": {
        "baseline_throughput": baseline_throughput,
        "proposed_changes": changes,
    },
}
`;

export function buildOptimizationScript(mode: 'max-throughput' | 'min-cycle-time' | 'balance-utilization' | 'custom-script', customScript?: string) {
  const body =
    mode === 'max-throughput'
      ? MAX_THROUGHPUT_BODY
      : mode === 'min-cycle-time'
      ? MIN_CYCLE_TIME_BODY
      : mode === 'balance-utilization'
      ? BALANCE_UTILIZATION_BODY
      : customScript || CUSTOM_OPTIMIZATION_TEMPLATE;

  return `${PY_RUNTIME}\n${body}\n`;
}
