# Guía Rápida de Uso - Editor de Nodos v2.0

## 🚀 Inicio Rápido

### 1️⃣ Crear Nodos
- **Arrastra** un componente desde la barra izquierda al canvas
- El nodo aparecerá en la posición exacta donde lo soltaste
- **Ahora funciona correctamente con zoom y pan**

### 2️⃣ Seleccionar y Configurar
1. **Haz clic** en un nodo para seleccionarlo
2. Aparecerá destacado en azul
3. En el panel derecho, verás todas las propiedades:
   - **Posición**: X, Y (solo lectura)
   - **% Utilización de Recurso**: Slider interactivo (0-100%)
   - **Tipo Personalizado**: Define si es Fuente, Sumidero, etc.
   - **Propiedades de Configuración**: Específicas del tipo de nodo
   - **Entradas/Salidas**: Información de conectores

### 3️⃣ Conectar Nodos (Crear Redes)
1. **Haz clic** en un conector de salida (verde, lado derecho)
2. **Arrastra** hasta un conector de entrada (azul, lado izquierdo)
3. Se crea automáticamente la conexión
4. **¿Múltiples conexiones?** Repite el proceso:
   - Desde el **mismo conector** a otros nodos ✅
   - Desde otros nodos al **mismo destino** ✅
   - Crea redes complejas sin límite ✅

### 4️⃣ % Utilización de Recurso (Calculado)
1. Selecciona un nodo
2. En panel derecho → "% Utilización de Recurso"
3. **Este valor es calculado automáticamente por el script Python**
4. La barra dentro del nodo cambia de color según el valor:
   - 🟢 **Verde** (0-50%): Normal
   - 🟡 **Amarillo** (50-80%): Precaución
   - 🔴 **Rojo** (80-100%): Crítico
5. Para cambiar la utilización, modifica el script Python del bloque

### 5️⃣ Tipo Personalizado
1. Selecciona un nodo
2. En "Tipo de Nodo Personalizado", escribe:
   - `Fuente` - Entrada de sistema
   - `Sumidero` - Salida de sistema
   - `Transformador` - Convierte energía
   - `Regulador` - Controla flujo
   - O cualquier término personalizado
3. Se **persiste con el nodo**

### 6️⃣ Guardar y Cargar
- **Guardar**: Click en botón "Guardar" (izquierda)
- **Cargar**: Click en botón "Cargar" (izquierda)
- Se guarda el **proyecto completo** con todos los nodos, conexiones y propiedades

## 🎮 Controles del Canvas

| Acción | Control |
|--------|---------|
| **Mover nodo** | Click + Arrastrar |
| **Seleccionar nodo** | Click |
| **Conectar** | Click conector → Arrastrar → Click destino |
| **Hacer zoom** | Rueda del ratón |
| **Mover vista** | Click derecho + Arrastrar |
| **Eliminar nodo** | Seleccionar + Click en ✕ (arriba derecha) |
| **Eliminar conexión** | Seleccionar + Click en ✕ |
| **Deseleccionar** | Click en canvas vacío |

## 🔗 Ejemplo: Sistema de Aire Comprimido

### Objetivo
Crear un sistema donde:
- 2 compresores alimentan un tanque
- El tanque distribuye a 3 líneas
- Monitorear utilización de recursos

### Pasos

**Paso 1: Crear nodos**
```
1. Arrastra "Compresor" 2 veces → Compresor 1 y 2
2. Arrastra "Tanque" 1 vez → Tanque Central
3. Arrastra "Filtro" 3 veces → Línea 1, 2, 3
```

**Paso 2: Configurar utilización**
```
- Compresor 1: 65% utilización
- Compresor 2: 75% utilización
- Tanque: 80% utilización
- Línea 1: 45% utilización
- Línea 2: 55% utilización
- Línea 3: 30% utilización
```

**Paso 3: Conectar**
```
- Compresor 1 (salida) → Tanque (entrada)
- Compresor 2 (salida) → Tanque (entrada)
- Tanque (salida) → Línea 1 (entrada)
- Tanque (salida) → Línea 2 (entrada)
- Tanque (salida) → Línea 3 (entrada)
```

**Paso 4: Personalizaciones**
```
- Compresor 1: Tipo = "Fuente Principal"
- Compresor 2: Tipo = "Fuente Auxiliar"
- Tanque: Tipo = "Regulador"
- Línea 1: Tipo = "Rama Taller"
- Línea 2: Tipo = "Rama Pintura"
- Línea 3: Tipo = "Rama Neumática"
```

**Paso 5: Guardar**
- Click "Guardar" para persistir el proyecto

## ⚠️ Problemas Comunes

| Problema | Solución |
|----------|----------|
| Nodo aparece en lugar errado | Ya está **ARREGLADO** - usa las nuevas coordenadas |
| No veo % utilización | Selecciona el nodo → Panel derecho (busca la barra) |
| Conexión no se crea | Arrastra de conector a conector, no del nodo |
| Zoom muy alejado | Rueda del ratón hacia arriba para acercar |
| No se guarda | Verifica el botón "Guardar" en panel izquierdo |

## 📊 Visualización de Redes

Ahora el sistema soporta:

```
Network Simple:           Network Compleja:           Network Kirchhoff:
A → B → C                A ┐                          A → {B, C}
                           ├→ D                            ↓
                         B ┘                          B → {D, E}
                                                           ↓
                                                      {D, E} → F
```

## 🔮 Características Avanzadas

### Tipo de Conector
- Los conectores tienen tipos: `energy`, `air`, `water`, `number`, `string`
- Actualmente **no se valida** (próxima versión)

### Propiedades de Conexión
- Las conexiones pueden tener propiedades personalizadas
- Guardadas en `properties: Record<string, any>`
- Disponibles para análisis posterior

### Nodos Personalizados
- El campo "Tipo" es libre
- Puedes inventar tus propias categorías
- Se usa para identificar el rol del nodo en la red

## 💡 Consejos Pro

1. **Organiza espacialmente**: Coloca fuentes a la izquierda, sumideros a la derecha
2. **Usa colores mentales**: Verde para entrada, Rojo para salida
3. **Documenta tipos**: Sé consistente con nombres (Fuente, Sumidero, etc)
4. **Monitorea utilización**: Rojo = posible cuello de botella
5. **Guarda frecuentemente**: Especialmente después de cambios importantes

## 🆘 Soporte

Si encuentras problemas:
1. Revisa [CAMBIOS.md](./CAMBIOS.md) - Resumen técnico
2. Revisa [KIRCHHOFF_GUIDE.md](./KIRCHHOFF_GUIDE.md) - Teoría de redes
3. Abre las DevTools (F12) para ver errores en consola
