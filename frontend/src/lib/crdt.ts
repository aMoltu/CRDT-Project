import { loadModule } from './wasm-loader'

// ── GCounter ──────────────────────────────────────────────────────────────────

export interface GCounterHandle {
  increment: (amount: number) => void
  value:     () => number
  merge:     (other: GCounterHandle) => void
  slot:      (index: number) => number
  nodeId:    () => number
  numNodes:  () => number
  delete:    () => void
}

export async function createGCounter(nodeId: number, numNodes: number): Promise<GCounterHandle> {
  const M = await loadModule()
  return new M.GCounter(nodeId, numNodes) as GCounterHandle
}
