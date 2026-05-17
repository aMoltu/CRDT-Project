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

// ── LineSegment (used for GSet) ─────────────────────────────────────────────────────────

export interface LineSegment {
  x1: number; y1: number
  x2: number; y2: number
  r:  number; g: number; b: number
  width: number
}

// embind vector wrapper returned by state() — iterate with .size() / .get(i)
export interface VectorLineSegment {
  size:   () => number
  get:    (index: number) => LineSegment
  delete: () => void
}

// ── GSet<LineSegment> ─────────────────────────────────────────────────────────

export interface GSetHandle {
  insert: (seg: LineSegment) => void
  merge:  (other: GSetHandle) => void
  size:   () => number
  state:  () => VectorLineSegment
  delete: () => void
}

export async function createGSet(): Promise<GSetHandle> {
  const M = await loadModule()
  return new M.GSet() as GSetHandle
}

// ── RGA ───────────────────────────────────────────────────────────────────────

export interface RGAHandle {
  insert:          (leftNodeId: number, leftSeq: number, value: string) => void
  remove_at:       (visualPos: number) => void
  merge:           (other: RGAHandle) => void
  text:            () => string
  left_node_id_at: (k: number) => number
  left_seq_at:     (k: number) => number
  get_node_id:     () => number
  chars_json:      () => string
  delete:          () => void
}

export async function createRGA(nodeId: number): Promise<RGAHandle> {
  const M = await loadModule()
  return new M.RGA(nodeId) as RGAHandle
}
