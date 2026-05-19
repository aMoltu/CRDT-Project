import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createGCounter, type GCounterHandle } from '@/lib/crdt'
import { ConnectionBar } from '@/components/RoomBanner'
import { useConnection } from '@/lib/room'

export default function GCounterOnline() {
  const navigate = useNavigate()
  const connection = useConnection()
  const ref = useRef<GCounterHandle | null>(null)
  const [value, setValue] = useState(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // The server will assign a real nodeId and N on connect.
    // nodeId=0, N=1 is a stub for offline use.
    createGCounter(0, 1)
      .then(c => { ref.current = c; setValue(c.value()); setReady(true) })
      .catch(e => setError(String(e)))
    return () => { ref.current?.delete() }
  }, [])

  function increment() {
    ref.current?.increment(1)
    setValue(ref.current?.value() ?? 0)
    // TODO: room.send({ type: 'gcounter_increment', nodeId, delta: 1 })
  }

  // TODO: room.onOp(op => {
  //   if (op.type === 'gcounter_increment') { /* merge slot */ }
  //   setValue(ref.current?.value() ?? 0)
  // })

  if (error) return (
    <div className="flex items-center justify-center min-h-screen text-destructive">
      Failed to load WASM module: {error}
    </div>
  )

  return (
    <div className="flex flex-col items-center min-h-screen gap-6 p-8">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
        <h1 className="text-2xl font-bold">G-Counter — Online</h1>
        <div className="w-16" />
      </div>

      <ConnectionBar connection={connection} />

      <p className="text-muted-foreground text-sm max-w-md text-center">
        Increment your counter. When connected, other users' increments merge in automatically —
        the total is the element-wise max across all nodes.
      </p>

      {!ready ? (
        <p className="text-muted-foreground">Loading WASM module…</p>
      ) : (
        <Card className="w-48">
          <CardContent className="flex flex-col items-center gap-4 pt-6 pb-6">
            <div className="text-6xl font-mono font-bold">{value}</div>
            <Button onClick={increment} className="w-full" size="lg">+ Increment</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
