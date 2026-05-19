// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface WasmModule { [key: string]: any }

let modulePromise: Promise<WasmModule> | null = null

export function loadModule(): Promise<WasmModule> {
  if (modulePromise) return modulePromise
  modulePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = '/crdt_wasm.js'
    script.onload = async () => {
      try { resolve(await (window as unknown as Window & { CRDTModule: () => Promise<WasmModule> }).CRDTModule()) }
      catch (e) { reject(e) }
    }
    script.onerror = () => reject(new Error('Failed to load crdt_wasm.js'))
    document.head.appendChild(script)
  })
  return modulePromise
}
