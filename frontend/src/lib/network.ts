export type MergeHandler = (sourceIndex: number) => void

export class LocalNetwork {
  private readonly n: number
  private handlers: (MergeHandler | null)[]
  private disconnected = new Set<number>()
  // ops each node missed while it was partitioned
  private inbound = new Map<number, Set<number>>()

  constructor(n: number) {
    this.n = n
    this.handlers = new Array<MergeHandler | null>(n).fill(null)
    for (let i = 0; i < n; i++) this.inbound.set(i, new Set())
  }

  register(i: number, handler: MergeHandler) {
    this.handlers[i] = handler
  }

  // Call after node `from` performs any local operation.
  broadcast(from: number) {
    if (this.disconnected.has(from)) return
    for (let to = 0; to < this.n; to++) {
      if (to === from) continue
      if (this.disconnected.has(to)) {
        this.inbound.get(to)!.add(from)
      } else {
        this.handlers[to]?.(from)
      }
    }
  }

  disconnect(i: number) {
    this.disconnected.add(i)
  }

  // Flush buffered changes in both directions on reconnect.
  reconnect(i: number) {
    this.disconnected.delete(i)

    // Apply everything node i missed while partitioned
    const missed = this.inbound.get(i)!
    this.inbound.set(i, new Set())
    for (const src of missed) {
      this.handlers[i]?.(src)
    }

    // Push node i's accumulated changes to all currently-connected peers
    for (let to = 0; to < this.n; to++) {
      if (to === i) continue
      if (this.disconnected.has(to)) {
        this.inbound.get(to)!.add(i)
      } else {
        this.handlers[to]?.(i)
      }
    }
  }

  isConnected(i: number): boolean {
    return !this.disconnected.has(i)
  }
}
