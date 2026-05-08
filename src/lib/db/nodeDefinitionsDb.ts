import fs from 'fs';
import path from 'path';
import { NodeDefinition } from '@/types';
import { DEFAULT_NODE_DEFINITIONS } from '@/lib/nodes';
import { normalizeNodeDefinitions } from '@/lib/nodeDefinitionUtils';

const DATA_DIR = path.join(process.cwd(), 'data');
const NODE_DEFINITIONS_FILE = path.join(DATA_DIR, 'node-definitions.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function writeDefinitionsFile(definitions: NodeDefinition[]) {
  ensureDataDir();
  fs.writeFileSync(NODE_DEFINITIONS_FILE, JSON.stringify(definitions, null, 2));
}

function ensureDefinitionsFile() {
  ensureDataDir();

  if (!fs.existsSync(NODE_DEFINITIONS_FILE)) {
    writeDefinitionsFile(Object.values(DEFAULT_NODE_DEFINITIONS));
  }
}

export function getAllNodeDefinitions(): NodeDefinition[] {
  ensureDefinitionsFile();

  try {
    const raw = fs.readFileSync(NODE_DEFINITIONS_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as NodeDefinition[];
    return normalizeNodeDefinitions(parsed);
  } catch (error) {
    console.error('Error reading node definitions:', error);
    return normalizeNodeDefinitions(Object.values(DEFAULT_NODE_DEFINITIONS));
  }
}

export function saveAllNodeDefinitions(definitions: NodeDefinition[]) {
  const normalized = normalizeNodeDefinitions(definitions);
  writeDefinitionsFile(normalized);
  return normalized;
}
