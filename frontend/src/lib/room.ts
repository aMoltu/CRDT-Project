import { useState, useEffect, useRef, useCallback } from 'react'

export type ConnectionStatus = 'offline' | 'connecting' | 'connected' | 'partitioned'

export interface ConnectionHandle {
  status: ConnectionStatus
  send: (msg: unknown) => void
  disconnect: () => void
  reconnect: () => void
}

const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080'

// Manages a single persistent WebSocket connection.
//
// Disconnect/reconnect simulate a network partition without closing the socket:
//   - disconnect(): incoming messages are buffered, outgoing are queued
//   - reconnect():  incoming buffer is replayed, outgoing queue is flushed
//
// This keeps the server-assigned nodeId stable across partition cycles.
export function useConnection(
  path: string,
  onMessage: (msg: unknown) => void,
): ConnectionHandle {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const ws          = useRef<WebSocket | null>(null)
  const partitioned = useRef(false)
  const sendQueue   = useRef<unknown[]>([])   // outgoing ops queued during partition
  const recvBuffer  = useRef<unknown[]>([])   // incoming messages buffered during partition
  const onMsgRef    = useRef(onMessage)
  onMsgRef.current  = onMessage               // always call the latest handler

  useEffect(() => {
    const socket = new WebSocket(`${WS_BASE}${path}`)
    ws.current = socket

    socket.onopen = () => setStatus('connected')

    socket.onmessage = (e) => {
      let parsed: unknown
      try { parsed = JSON.parse(e.data as string) } catch { return }
      if (partitioned.current) { recvBuffer.current.push(parsed); return }
      onMsgRef.current(parsed)
    }

    socket.onclose  = () => setStatus('offline')
    socket.onerror  = () => setStatus('offline')

    return () => socket.close()
  }, [path])

  const send = useCallback((msg: unknown) => {
    if (partitioned.current) { sendQueue.current.push(msg); return }
    if (ws.current?.readyState === WebSocket.OPEN)
      ws.current.send(JSON.stringify(msg))
  }, [])

  const disconnect = useCallback(() => {
    partitioned.current = true
    setStatus('partitioned')
  }, [])

  const reconnect = useCallback(() => {
    partitioned.current = false
    setStatus('connected')
    // Replay buffered incoming messages first, then flush outgoing queue
    const incoming = recvBuffer.current.splice(0)
    for (const msg of incoming) onMsgRef.current(msg)
    const outgoing = sendQueue.current.splice(0)
    if (ws.current?.readyState === WebSocket.OPEN)
      for (const msg of outgoing) ws.current.send(JSON.stringify(msg))
  }, [])

  return { status, send, disconnect, reconnect }
}
