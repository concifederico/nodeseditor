# Redes Tipo Kirchhoff - Guía de Uso

## Concepto

Las **redes tipo Kirchhoff** permiten que múltiples nodos se conecten entre sí con más de dos conexiones, formando redes complejas. Esto sigue las leyes de Kirchhoff:

- **Ley de Corrientes (LCK)**: La suma de corrientes que entran a un nodo es igual a la suma de corrientes que salen
- **Ley de Voltajes (LVK)**: La suma de voltajes alrededor de un circuito cerrado es cero

## Arquitectura de Conexiones Múltiples

En el editor, las conexiones **ya permiten arquitecturas complejas**:

```
Nodo A (Output)  ──┐
                    ├─→ Nodo C (Input)
Nodo B (Output)  ──┘

Nodo D (Output)  ──┐
                    ├─→ Nodo E (Input)
Nodo F (Output)  ──┘
```

## Características Implementadas

### 1. ✅ Conexiones Múltiples Entre Conectores
- Cada conector (entrada/salida) puede conectarse a múltiples nodos
- No hay límite de conexiones por conector
- Se valida automáticamente evitando:
  - Duplicados entre los mismos conectores
  - Auto-conexiones (nodo consigo mismo)

### 2. ✅ Visualización de Redes
- **Líneas Bezier**: Las conexiones usan curvas suaves para mejor visualización
- **Color de Selección**: Las conexiones seleccionadas se destacan en azul claro
- **Información de Tipos**: Se validan tipos de datos (energy, water, etc.)

### 3. ✅ Simulación Kirchhoff (Estructura preparada)
La estructura de `Connection` permite:
```typescript
interface Connection {
  id: string;
  sourceNodeId: string;
  sourceConnectorId: string;
  targetNodeId: string;
  targetConnectorId: string;
  properties?: Record<string, any>; // Para valores de flujo, voltaje, etc.
}
```

## Casos de Uso

### Ejemplo 1: Red de Distribución de Aire Comprimido
```
Compresor 1 (7.5 kW)  ──┐
                        ├─→ Tanque
Compresor 2 (7.5 kW)  ──┘

Tanque  ──┬─→ Línea 1 (Taller)
          ├─→ Línea 2 (Pintura)
          └─→ Línea 3 (Neumática)
```

### Ejemplo 2: Red de Tratamiento de Aire
```
Entrada de Aire  ──→ Filtro 1  ──┐
                                  ├─→ Separador
                   Filtro 2    ──┘
```

## Para Implementar Análisis Kirchhoff

Si deseas analizar y simular circuitos:

1. **Crear un analizador** en `src/lib/analysis/kirchhoffAnalyzer.ts`:
```typescript
export function analyzeKirchhoffLaws(canvas: CanvasState) {
  // Implementar leyes de Kirchhoff
  // Calcular flujos, voltajes, etc.
}
```

2. **Validar nodos** por tipo (fuente, sumidero, transformador)
3. **Calcular balance** en cada nodo
4. **Detectar ciclos** para análisis de mallas

## Próximos Pasos Opcionales

- [ ] Agregar validación de tipos entre conectores
- [ ] Implementar análisis de flujos según Kirchhoff
- [ ] Añadir simulación numérica
- [ ] Crear interfaz de resultados de análisis
