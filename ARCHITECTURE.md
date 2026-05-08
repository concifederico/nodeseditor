# Arquitectura del Editor de Nodos v2.0

## 🏗️ Estructura General

```
┌─────────────────────────────────────────────────────────┐
│                      Node Editor App                     │
│                   (src/app/page.tsx)                     │
├─────────────────────────────────────────────────────────┤
│  Layout (3 panels)                                      │
├─────────┬──────────────────────┬─────────┐
│ Toolbar │       Canvas         │Properties│
│ Panel   │       Panel          │ Panel    │
│ 256px   │     Flex 1           │  256px   │
└─────────┴──────────────────────┴─────────┘
```

## 📦 Componentes Principales

### 1. **Toolbar** (`src/components/Toolbar/Toolbar.tsx`)
- Lista de componentes disponibles
- Drag & Drop con **conversión de coordenadas**
- Botones: Guardar, Cargar, Limpiar

### 2. **Canvas** (`src/components/Canvas/Canvas.tsx`)
- SVG interactivo con zoom y pan
- Renderiza nodos y conexiones
- Maneja eventos de mouse para arrastrar y conectar

### 3. **Properties Panel** (`src/components/Properties/PropertiesPanel.tsx`)
- Editor de propiedades del nodo seleccionado
- **Slider de % Utilización** (0-100%)
- Campo de **Tipo Personalizado**
- Editor de configuración específica del nodo

### 4. **Componentes Visuales**
- **Node.tsx**: Renderiza nodos individuales con barra de utilización
- **Connection.tsx**: Renderiza conexiones con líneas Bezier

## 🗄️ Estado (Zustand Store)

```typescript
interface CanvasState {
  id: string
  name: string
  nodes: NodeInstance[]      // Array de nodos en el canvas
  connections: Connection[]   // Array de conexiones
  createdAt: number
  updatedAt: number
}

interface UIState {
  selectedNodeId: string | null
  selectedConnectionId: string | null
  zoom: number
  panX: number
  panY: number
  isDragging: boolean
  dragOffset: { x: number; y: number }
}
```

## 📝 Tipos de Datos Principales

### NodeInstance
```typescript
interface NodeInstance {
  id: string                          // UUID único
  definitionId: string                // Referencia a definición (ej: "compressor")
  x: number                           // Posición X en canvas
  y: number                           // Posición Y en canvas
  config: Record<string, string | number | boolean>  // Valores de configuración
  connectorValues: Record<string, any> // Valores de conectores
  resourceUtilization?: number        // 0-100%  [NUEVO]
  customType?: string                 // Tipo personalizado [NUEVO]
}
```

### Connection
```typescript
interface Connection {
  id: string
  sourceNodeId: string
  sourceConnectorId: string
  targetNodeId: string
  targetConnectorId: string
  properties?: Record<string, any>    // Para flujos, voltajes, etc
}
```

## 🔄 Flujo de Datos

### Crear Nodo
```
User drags component
  ↓
handleDrop (Toolbar)
  ↓
clientToCanvasCoordinates() [UTIL]
  ↓
addNode(definitionId, x, y) [ZUSTAND]
  ↓
New node appears on Canvas
```

### Actualizar Utilización
```
User moves slider (Properties)
  ↓
updateNodeResourceUtilization() [ZUSTAND]
  ↓
Node.resourceUtilization updated
  ↓
Canvas re-renders with new color
```

### Conectar Nodos
```
User drags connector to connector
  ↓
handleConnectorMouseUp (Canvas)
  ↓
addConnection() [ZUSTAND]
  ↓
Connection validated and added
  ↓
Connection rendered on Canvas
```

## 🎨 Utilidades Nuevas

### `src/lib/utils.ts`
```typescript
clientToCanvasCoordinates(
  clientX, clientY,
  containerRect,
  zoom, panX, panY
) → { x, y }

canvasToClientCoordinates(
  canvasX, canvasY,
  containerRect,
  zoom, panX, panY
) → { x, y }
```

**Propósito**: Convertir entre espacios de coordenadas:
- **Client**: Coordenadas del mouse/pantalla
- **Canvas**: Coordenadas del espacio de trabajo (con zoom/pan aplicado)

## 🔌 Acciones del Store

### Nodos
- ✅ `addNode(definitionId, x, y)` → nodeId
- ✅ `removeNode(nodeId)`
- ✅ `updateNodePosition(nodeId, x, y)`
- ✅ `updateNodeConfig(nodeId, config)` [MEJORADO]
- ✅ `updateNodeResourceUtilization(nodeId, utilization)` [NUEVO]
- ✅ `updateNodeCustomType(nodeId, customType)` [NUEVO]

### Conexiones
- ✅ `addConnection(sourceNodeId, sourceConnectorId, targetNodeId, targetConnectorId)` [MEJORADO]
- ✅ `removeConnection(connectionId)`

### UI
- ✅ `selectNode(nodeId | null)`
- ✅ `selectConnection(connectionId | null)`
- ✅ `setZoom(zoom)`
- ✅ `setPan(x, y)`

## 🛡️ Validaciones

### Conexiones
- ❌ Previene auto-conexiones (nodo consigo mismo)
- ❌ Previene duplicados exactos
- ✅ Permite múltiples desde/hacia mismo conector
- ✅ Valida que nodos existan

### Utilización
- ✅ Rango 0-100%
- ✅ Auto-clamp si excede
- ✅ Coloreado automático

## 📊 Definiciones de Nodos

```typescript
interface NodeDefinition {
  id: string                    // Identificador único
  name: string                  // Nombre a mostrar
  category: NodeCategory        // compressor, tank, filter, etc
  description: string
  inputs: Connector[]          // Conectores de entrada
  outputs: Connector[]         // Conectores de salida
  configProperties: ConfigProperty[]  // Propiedades editables
  icon?: string
  width?: number
  height?: number
}
```

Definiciones cargadas desde `src/lib/nodes.ts`:
- Compresor
- Tanque
- Filtro
- Separador
- Regulador
- (Extensible)

## 🌐 Red Kirchhoff - Soporte Arquitectónico

```
Nodo Fuente A ──┐
                ├─→ Nodo Procesador D ──┐
Nodo Fuente B ──┘                       ├─→ Nodo Sumidero F
                                        │
Nodo Fuente C ──────────────────────────┘
```

**Características soportadas**:
- Many-to-One: Múltiples fuentes a un destino
- One-to-Many: Una fuente a múltiples destinos
- Many-to-Many: Redes complejas completas
- Sin límite de complejidad

## 🎯 Flujo de Renderizado (Canvas SVG)

```
Canvas Component
  ↓
[Grid Pattern]
  ↓
[Zoom/Pan Group] ← transform={translate(panX, panY) scale(zoom)}
  ├─ [Connections] → Connection components
  ├─ [Temp Line] ← Durante drag
  └─ [Nodes] → Node components
      ├─ Background rect
      ├─ Title + Category
      ├─ Resource bar [NUEVO]
      ├─ Divider
      ├─ Input connectors (circles + labels)
      └─ Output connectors (circles + labels)
```

## 📈 Performance Considerations

- **SVG scale**: Usar `transform` en grupo para zoom (no reescalar nodos)
- **Memoization**: Canvas re-renderiza toda la estructura
- **Conexiones**: Líneas Bezier calculadas en renderizado
- **Eventos**: Delegados en SVG padre

## 🔮 Extensibilidad

### Agregar nuevo tipo de nodo
1. Crear entrada en `NODE_DEFINITIONS` (src/lib/nodes.ts)
2. Definir inputs/outputs/configProperties
3. Arrastrarlo automáticamente funciona

### Agregar nueva propiedad a nodos
1. Actualizar `NodeInstance` (src/types/index.ts)
2. Crear acción en store
3. Agregar control en PropertiesPanel
4. ✓ Listo

### Implementar análisis
1. Crear `src/lib/analysis/kirchhoffAnalyzer.ts`
2. Leer canvas state
3. Calcular flujos según leyes de Kirchhoff
4. Integrar UI de resultados

## 📚 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/types/index.ts` | Agregados campos resourceUtilization, customType |
| `src/lib/store/canvasStore.ts` | Nuevas acciones, validación mejorada |
| `src/lib/utils.ts` | ✨ Funciones de conversión de coordenadas |
| `src/components/Toolbar/Toolbar.tsx` | Drag & Drop mejorado |
| `src/components/Properties/PropertiesPanel.tsx` | Panel completo con slider |
| `src/components/Canvas/Node.tsx` | Barra de utilización visual |

## ✅ Checklist de Implementación

- ✅ Drag & Drop corregido (conversión de coordenadas)
- ✅ % Utilización de recursos implementado
- ✅ Tipo personalizado de nodo implementado
- ✅ Conexiones múltiples soportadas
- ✅ Validación mejorada
- ✅ Visualización enhanced
- ✅ Documentación completa
- ⏳ Análisis de Kirchhoff (futuro)
- ⏳ Validación de tipos (futuro)
- ⏳ Simulación (futuro)
