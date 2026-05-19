export type ConnectionStatus = 'offline' | 'connecting' | 'connected' | 'partitioned'

export interface ConnectionHandle {
  status: ConnectionStatus
  disconnect: () => void
  reconnect: () => void
}

// Stub — always offline until a WebSocket server is wired up.
//
// TODO: replace with a real WebSocket connection:
//   useEffect(() => {
//     const ws = new WebSocket('wss://your-server/crdt')
//     ws.onopen    = () => setStatus('connected')
//     ws.onclose   = () => setStatus('offline')
//     ws.onmessage = (e) => applyOp(JSON.parse(e.data))
//     return () => ws.close()
//   }, [])
//
// Expected op shapes:
//   { type: 'rga_insert',         leftNodeId, leftSeq, char, nodeId, seq, lamport }
//   { type: 'rga_remove',         nodeId, seq }         ← needs remove_by_id in WASM
//   { type: 'gcounter_increment', nodeId, delta }
//   { type: 'gset_insert',        seg: LineSegment }
export function useConnection(): ConnectionHandle {
  return {
    status: 'offline',
    disconnect: () => {},
    reconnect:  () => {},
  }
}
