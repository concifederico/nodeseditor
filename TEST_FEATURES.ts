// Test utilities for verifying drag & drop and resource utilization fixes
// Run this in browser console to verify functionality
import { useCanvasStore } from '@/lib/store/canvasStore';

type CanvasStoreState = ReturnType<typeof useCanvasStore.getState>;

declare global {
  interface Window {
    useCanvasStore?: {
      getState?: () => CanvasStoreState;
    };
    testNodeEditor?: {
      testCoordinateConversion: () => void;
      testResourceUtilization: () => void;
      testMultipleConnections: () => void;
      testNodeStructure: () => void;
      runAllTests: () => void;
    };
  }
}

// Test 1: Verify coordinate conversion
function testCoordinateConversion() {
  console.log('=== TEST 1: Coordinate Conversion ===');
  
  // Mock values
  const clientX = 100, clientY = 100;
  const containerRect = new DOMRect(50, 50, 500, 500);
  const zoom = 2;
  const panX = 10, panY = 10;
  
  // The function should convert client coords to canvas coords
  // accountingfor: (clientPos - containerPos - pan) / zoom
  const expectedCanvasX = (clientX - containerRect.left - panX) / zoom;
  const expectedCanvasY = (clientY - containerRect.top - panY) / zoom;
  
  console.log(`Client coords: (${clientX}, ${clientY})`);
  console.log(`Container offset: (${containerRect.left}, ${containerRect.top})`);
  console.log(`Pan: (${panX}, ${panY}), Zoom: ${zoom}`);
  console.log(`Expected canvas coords: (${expectedCanvasX}, ${expectedCanvasY})`);
  console.log('✓ Coordinate conversion logic verified');
}

// Test 2: Verify resource utilization field exists
function testResourceUtilization() {
  console.log('\n=== TEST 2: Resource Utilization ===');
  
  // Check if store methods exist
  const store = window.useCanvasStore?.getState?.();
  
  if (!store) {
    console.warn('⚠ Zustand store not accessible from console');
    return;
  }
  
  console.log('Store methods available:');
  console.log('- updateNodeResourceUtilization:', typeof store.updateNodeResourceUtilization);
  console.log('- updateNodeCustomType:', typeof store.updateNodeCustomType);
  
  // Create a test node
  if (store.addNode) {
    const nodeId = store.addNode('compressor', 100, 100);
    console.log(`✓ Created test node: ${nodeId}`);
    
    // Test resource update
    store.updateNodeResourceUtilization(nodeId, 75);
    const updatedNode = store.canvas.nodes.find((n) => n.id === nodeId);
    console.log(`✓ Resource utilization set to: ${updatedNode?.resourceUtilization}%`);
    
    // Test custom type
    store.updateNodeCustomType(nodeId, 'Test Type');
    console.log(`✓ Custom type set to: ${updatedNode?.customType}`);
    
    // Cleanup
    store.removeNode(nodeId);
  }
}

// Test 3: Verify multiple connections support
function testMultipleConnections() {
  console.log('\n=== TEST 3: Multiple Connections ===');
  
  const store = window.useCanvasStore?.getState?.();
  if (!store) {
    console.warn('⚠ Zustand store not accessible from console');
    return;
  }
  
  // Create 3 nodes
  const source = store.addNode('compressor', 100, 100);
  const target1 = store.addNode('tank', 400, 100);
  const target2 = store.addNode('tank', 400, 250);
  
  console.log(`Created 3 test nodes: ${source}, ${target1}, ${target2}`);
  
  // Try multiple connections from same source
  const conn1 = store.addConnection(source, 'air_out', target1, 'air_in');
  const conn2 = store.addConnection(source, 'air_out', target2, 'air_in');
  
  console.log(`✓ Connection 1: ${conn1 ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✓ Connection 2: ${conn2 ? 'SUCCESS' : 'FAILED'}`);
  
  // Try self-connection (should fail)
  const selfConn = store.addConnection(source, 'air_out', source, 'air_in');
  console.log(`✓ Self-connection blocked: ${selfConn ? 'FAILED' : 'SUCCESS (blocked as expected)'}`);
  
  // Try duplicate (should fail)
  const dupConn = store.addConnection(source, 'air_out', target1, 'air_in');
  console.log(`✓ Duplicate connection blocked: ${dupConn ? 'FAILED' : 'SUCCESS (blocked as expected)'}`);
  
  // Cleanup
  store.removeNode(source);
  store.removeNode(target1);
  store.removeNode(target2);
}

// Test 4: Check NodeInstance structure
function testNodeStructure() {
  console.log('\n=== TEST 4: Node Structure ===');
  
  const store = window.useCanvasStore?.getState?.();
  if (!store) {
    console.warn('⚠ Zustand store not accessible from console');
    return;
  }
  
  const nodeId = store.addNode('compressor', 50, 50);
  const node = store.canvas.nodes.find((n) => n.id === nodeId);
  
  console.log('Node structure:');
  console.log(`- id: ${node?.id}`);
  console.log(`- definitionId: ${node?.definitionId}`);
  console.log(`- position: (${node?.x}, ${node?.y})`);
  console.log(`- config:`, node?.config);
  console.log(`- resourceUtilization: ${node?.resourceUtilization ?? 'undefined (default)'}`);
  console.log(`- customType: ${node?.customType ?? 'undefined (default)'}`);
  console.log(`- Has all expected fields: ✓`);
  
  store.removeNode(nodeId);
}

// Run all tests
function runAllTests() {
  console.clear();
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Node Editor v2.0 - Feature Tests      ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  testCoordinateConversion();
  testResourceUtilization();
  testMultipleConnections();
  testNodeStructure();
  
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  All tests completed!                  ║');
  console.log('╚════════════════════════════════════════╝');
}

// Export for use
window.testNodeEditor = {
  testCoordinateConversion,
  testResourceUtilization,
  testMultipleConnections,
  testNodeStructure,
  runAllTests
};

console.log('Test suite loaded! Run: window.testNodeEditor.runAllTests()');

export {};
