import { CanvasState } from '@/types';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const CANVASES_FILE = path.join(DATA_DIR, 'canvases.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Ensure canvases file exists
function ensureCanvasesFile() {
  ensureDataDir();
  if (!fs.existsSync(CANVASES_FILE)) {
    fs.writeFileSync(CANVASES_FILE, JSON.stringify([], null, 2));
  }
}

// Get all canvases
export function getAllCanvases(): CanvasState[] {
  ensureCanvasesFile();
  try {
    const data = fs.readFileSync(CANVASES_FILE, 'utf-8');
    return JSON.parse(data) as CanvasState[];
  } catch (error) {
    console.error('Error reading canvases:', error);
    return [];
  }
}

// Get canvas by ID
export function getCanvasById(id: string): CanvasState | null {
  const canvases = getAllCanvases();
  return canvases.find((c) => c.id === id) || null;
}

// Save canvas
export function saveCanvas(canvas: CanvasState): CanvasState {
  ensureCanvasesFile();
  const canvases = getAllCanvases();
  
  const existingIndex = canvases.findIndex((c) => c.id === canvas.id);
  const updatedCanvas = {
    ...canvas,
    updatedAt: Date.now(),
  };

  if (existingIndex >= 0) {
    canvases[existingIndex] = updatedCanvas;
  } else {
    canvases.push(updatedCanvas);
  }

  fs.writeFileSync(CANVASES_FILE, JSON.stringify(canvases, null, 2));
  return updatedCanvas;
}

// Delete canvas
export function deleteCanvas(id: string): boolean {
  ensureCanvasesFile();
  const canvases = getAllCanvases();
  const filtered = canvases.filter((c) => c.id !== id);
  
  if (filtered.length < canvases.length) {
    fs.writeFileSync(CANVASES_FILE, JSON.stringify(filtered, null, 2));
    return true;
  }
  
  return false;
}

// Create new canvas
export function createCanvas(name: string, description?: string): CanvasState {
  const canvas: CanvasState = {
    id: randomUUID(),
    name,
    description,
    nodes: [],
    connections: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return saveCanvas(canvas);
}

// Search canvases
export function searchCanvases(query: string): CanvasState[] {
  const canvases = getAllCanvases();
  const lowerQuery = query.toLowerCase();
  
  return canvases.filter(
    (c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description?.toLowerCase().includes(lowerQuery)
  );
}
