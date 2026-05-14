# Editor de Nodos - Node Editor Application

Un editor interactivo de nodos construido con Next.js, React y TypeScript. Permite crear, configurar y conectar componentes de sistemas neumáticos.

## Características

### ✨ Funcionalidades Principales

- **Lienzo interactivo**: Editor SVG con soporte para pan y zoom
- **Sistema de nodos**: Nodos redondeados con conectores dinámicos
- **Conexiones**: Crea conexiones (lazos) entre nodos con validación
- **Categorías de nodos**: 
  - Compresor (Energía → Aire Comprimido + Residuo)
  - Tanque de almacenamiento
  - Filtro
  - Regulador de presión
  - Extensible para más tipos

- **Configuración de nodos**: Panel de propiedades para ajustar parámetros
- **Persistencia**: Guarda/carga proyectos en JSON
- **Drag & Drop**: Arrastra nodos desde la barra de herramientas al lienzo

### 🎨 Interfaz

- **Toolbar izquierda**: Lista de componentes disponibles con drag & drop
- **Lienzo central**: Área de trabajo con grid de referencia
- **Panel derecho**: Propiedades del nodo seleccionado

## Estructura del Proyecto

```
src/
├── app/
│   ├── api/
│   │   └── canvas/          # API routes para guardar/cargar
│   ├── page.tsx             # Página principal
│   └── layout.tsx
├── components/
│   ├── Canvas/              # Componente principal del canvas
│   │   ├── Canvas.tsx
│   │   ├── Node.tsx
│   │   └── Connection.tsx
│   ├── Toolbar/             # Barra de herramientas
│   └── Properties/          # Panel de propiedades
├── lib/
│   ├── nodes.ts             # Definiciones de nodos
│   ├── store/
│   │   └── canvasStore.ts   # Estado global (Zustand)
│   └── db/
│       └── canvasDb.ts      # Persistencia de datos
└── types/
    └── index.ts             # Tipos TypeScript
```

## Instalación

1. **Instalar dependencias**:
```bash
cd /home/federico/Documentos/Software/Next/nodeseditor
npm install
```

2. **Ejecutar en desarrollo**:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Uso

### Agregar Nodos

1. Arrastra un componente desde la **barra izquierda** hacia el **lienzo**
2. El nodo aparecerá en la posición donde lo sueltes

### Conectar Nodos

1. Haz clic y arrastra desde un **conector de salida** (verde) de un nodo
2. Suelta sobre un **conector de entrada** (azul) de otro nodo
3. Se creará una conexión entre ellos

### Configurar Nodos

1. Haz clic en un nodo para seleccionarlo (se resaltará en azul)
2. En el **panel derecho** ajusta sus propiedades
3. Los cambios se aplican automáticamente

### Eliminar Elementos

- **Nodos**: Selecciona el nodo y haz clic en la ❌ roja en la esquina superior derecha
- **Conexiones**: Selecciona la conexión y haz clic en la ❌ roja en el centro

### Controles del Lienzo

- **Zoom**: Rueda del ratón
- **Pan**: Botón central/derecho del ratón + movimiento
- **Seleccionar**: Clic izquierdo sobre nodos/conexiones

### Guardar y Cargar

- **Guardar**: Botón "Guardar" (archivo JSON)
- **Cargar**: Botón "Cargar" (carga el proyecto más reciente)
- **Limpiar**: Borra todos los nodos del lienzo actual

## Tipos de Nodos Disponibles

### Compresor
- **Entradas**: Energía (kW)
- **Salidas**: 
  - Aire Comprimido (caudal m³/min, presión bar)
  - Residuo (agua + aceite)
- **Configuración**: Potencia, Modelo, Eficiencia

### Tanque de Almacenamiento
- **Entrada**: Aire Comprimido
- **Salida**: Aire Comprimido
- **Configuración**: Volumen, Presión Máxima

### Filtro
- **Entrada**: Aire Comprimido
- **Salidas**:
  - Aire Filtrado
  - Residuo
- **Configuración**: Tipo de filtro

### Regulador de Presión
- **Entrada**: Aire Comprimido
- **Salida**: Aire Regulado
- **Configuración**: Presión de Salida

## Extensión del Sistema

### Agregar un Nuevo Tipo de Nodo

1. Edita `src/lib/nodes.ts`
2. Añade una nueva definición en `NODE_DEFINITIONS`:

```typescript
export const NODE_DEFINITIONS: Record<string, NodeDefinition> = {
  // ... otros nodos
  mynewnode: {
    id: 'mynewnode',
    name: 'Mi Nuevo Componente',
    category: 'custom',
    description: 'Descripción del componente',
    inputs: [
      {
        id: 'input1',
        name: 'Entrada',
        type: 'input',
        valueType: 'air',
        properties: [
          { name: 'flow', type: 'number', unit: 'm³/min', required: true }
        ],
        position: { x: 0, y: 30 }
      }
    ],
    outputs: [
      {
        id: 'output1',
        name: 'Salida',
        type: 'output',
        valueType: 'air',
        properties: [
          { name: 'flow', type: 'number', unit: 'm³/min', required: true }
        ],
        position: { x: 100, y: 30 }
      }
    ],
    configProperties: [
      {
        name: 'parameter1',
        label: 'Parámetro 1',
        type: 'number',
        unit: 'unidad',
        defaultValue: 0
      }
    ],
    width: 120,
    height: 100
  }
};
```

## Estado Global (Zustand Store)

El estado de la aplicación se gestiona con Zustand. Las principales acciones son:

- `addNode()`: Agregar un nodo al lienzo
- `removeNode()`: Eliminar un nodo
- `updateNodePosition()`: Mover un nodo
- `updateNodeConfig()`: Cambiar configuración del nodo
- `addConnection()`: Crear una conexión
- `removeConnection()`: Eliminar una conexión
- `setZoom()`: Cambiar zoom
- `setPan()`: Desplazar la vista

## Persistencia

Los proyectos se guardan en formato JSON en `data/canvases.json`. Cada proyecto almacena:
- Lista de nodos con posiciones y configuración
- Conexiones entre nodos
- Metadata (nombre, descripción, timestamps)

## Tipos de Datos

### Tipos de Conectores
- `energy`: Energía eléctrica
- `water`: Agua
- `number`: Valores numéricos
- `string`: Texto
- `boolean`: Booleano

### Propiedades de Conectores

Cada conector puede tener múltiples propiedades (como caudal, presión) que se definen en la configuración de su tipo.

## Configuración del Proyecto

- **TypeScript**: Tipado completo
- **Tailwind CSS**: Estilos
- **Zustand**: Gestión de estado
- **Next.js 16**: Framework
- **lucide-react**: Iconos

## Próximas Mejoras

- [ ] Cálculos de simulación física
- [ ] Validación de conexiones por tipo
- [ ] Exportar diagrama como imagen
- [ ] Historial de cambios (undo/redo)
- [ ] Búsqueda y filtrado de nodos
- [ ] Temas personalizables
- [ ] Modo oscuro/claro

## Desarrollo

### Build para producción
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## Licencia

MIT

## Contacto

Para consultas o sugerencias sobre el editor de nodos, contacta al equipo de desarrollo.
