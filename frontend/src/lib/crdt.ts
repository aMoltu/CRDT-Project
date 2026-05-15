interface CRDTModule {
  cwrap: (name: string, ret: string | null, args: string[]) => (...args: number[]) => number
}

let modulePromise: Promise<CRDTModule> | null = null

function loadModule(): Promise<CRDTModule> {
  if (modulePromise) return modulePromise

  modulePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = '/crdt_wasm.js'
    script.onload = async () => {
      try {
        const m = await (window as any).CRDTModule()
        resolve(m)
      } catch (e) {
        reject(e)
      }
    }
    script.onerror = () => reject(new Error('Failed to load crdt_wasm.js'))
    document.head.appendChild(script)
  })

  return modulePromise
}

export interface GCounterHandle {
  increment: (amount?: number) => void
  value: () => number
  merge: (other: GCounterHandle) => void
  slot: (index: number) => number
  numNodes: () => number
  destroy: () => void
  _ptr: number
}

export async function createGCounter(nodeId: number, numNodes: number): Promise<GCounterHandle> {
  const M = await loadModule()

  const _create    = M.cwrap('gcounter_create',    'number', ['number', 'number'])
  const _destroy   = M.cwrap('gcounter_destroy',   null,     ['number'])
  const _increment = M.cwrap('gcounter_increment', null,     ['number', 'number'])
  const _value     = M.cwrap('gcounter_value',     'number', ['number'])
  const _merge     = M.cwrap('gcounter_merge',     null,     ['number', 'number'])
  const _slot      = M.cwrap('gcounter_slot',      'number', ['number', 'number'])
  const _numNodes  = M.cwrap('gcounter_num_nodes', 'number', ['number'])

  const ptr = _create(nodeId, numNodes)

  return {
    _ptr:      ptr,
    increment: (amount = 1) => _increment(ptr, amount),
    value:     () => _value(ptr),
    merge:     (other) => _merge(ptr, other._ptr),
    slot:      (index) => _slot(ptr, index),
    numNodes:  () => _numNodes(ptr),
    destroy:   () => _destroy(ptr),
  }
}
