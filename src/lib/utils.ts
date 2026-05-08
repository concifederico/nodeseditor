/**
 * Convert client coordinates to canvas/SVG coordinates
 * accounting for zoom and pan transformations
 */
export function clientToCanvasCoordinates(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  zoom: number,
  panX: number,
  panY: number
): { x: number; y: number } {
  // Get position relative to container
  const relativeX = clientX - containerRect.left;
  const relativeY = clientY - containerRect.top;

  // Invert the SVG transformation: translate(panX, panY) scale(zoom)
  const x = (relativeX - panX) / zoom;
  const y = (relativeY - panY) / zoom;

  return { x, y };
}

/**
 * Convert canvas/SVG coordinates to client coordinates
 */
export function canvasToClientCoordinates(
  canvasX: number,
  canvasY: number,
  containerRect: DOMRect,
  zoom: number,
  panX: number,
  panY: number
): { x: number; y: number } {
  const clientX = canvasX * zoom + panX + containerRect.left;
  const clientY = canvasY * zoom + panY + containerRect.top;

  return { x: clientX, y: clientY };
}
