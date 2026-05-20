import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConnectionBar } from '@/components/RoomBanner'
import { useConnection } from '@/lib/room'

interface InitMsg      { type: 'gcounter_init';      node_id: number; slots: Record<string, number> }
interface IncrementMsg { type: 'gcounter_increment'; node_id: number; delta: number }
type GCMsg = InitMsg | IncrementMsg

export default function GCounterOnline() {
  const navigate = useNavigate()
  const nodeId = useRef<number>(-1)
  const [slots, setSlots] = useState<Map<number, number>>(new Map())
  const [ready, setReady] = useState(false)

  const onMessage = useCallback((raw: unknown) => {
    const msg = raw as GCMsg
    if (msg.type === 'gcounter_init') {
      nodeId.current = msg.node_id
      setSlots(new Map(Object.entries(msg.slots).map(([k, v]) => [Number(k), v])))
      setReady(true)
    } else if (msg.type === 'gcounter_increment') {
      setSlots(prev => {
        const next = new Map(prev)
        next.set(msg.node_id, (next.get(msg.node_id) ?? 0) + msg.delta)
        return next
      })
    }
  }, [])

  const connection = useConnection('/gcounter', onMessage)

  function increment() {
    const nid = nodeId.current
    if (nid < 0) return
    setSlots(prev => { const m = new Map(prev); m.set(nid, (m.get(nid) ?? 0) + 1); return m })
    connection.send({ type: 'gcounter_increment', node_id: nid, delta: 1 })
  }

  const total = Array.from(slots.values()).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col items-center min-h-screen gap-6 p-8">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
        <h1 className="text-2xl font-bold">G-Counter — Online</h1>
        <div className="w-16" />
      </div>

      <ConnectionBar connection={connection} />

      <p className="text-muted-foreground text-sm max-w-md text-center">
        Each user increments their own slot. The total is the sum across all nodes.
        Disconnect to diverge, reconnect to converge.
      </p>

      {!ready ? (
        <p className="text-muted-foreground">
          {connection.status === 'offline' ? 'Connecting to server…' : 'Waiting for server state…'}
        </p>
      ) : (
        <Card className="w-56">
          <CardContent className="flex flex-col items-center gap-4 pt-6 pb-6">
            <div className="text-6xl font-mono font-bold">{total}</div>
            <div className="text-xs text-muted-foreground font-mono">
              [{Array.from(slots.entries()).sort(([a],[b]) => a-b).map(([,v]) => v).join(', ')}]
            </div>
            <Button onClick={increment} className="w-full" size="lg">+ Increment</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
