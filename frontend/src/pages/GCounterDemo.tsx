import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createGCounter, type GCounterHandle } from '@/lib/crdt'

interface NodeState {
  value: number
  slots: [number, number]
}

function readState(counter: GCounterHandle): NodeState {
  return {
    value: counter.value(),
    slots: [counter.slot(0), counter.slot(1)],
  }
}

export default function GCounterDemo() {
  const navigate = useNavigate()
  const aRef = useRef<GCounterHandle | null>(null)
  const bRef = useRef<GCounterHandle | null>(null)

  const [aState, setAState] = useState<NodeState>({ value: 0, slots: [0, 0] })
  const [bState, setBState] = useState<NodeState>({ value: 0, slots: [0, 0] })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    createGCounter(0, 2)
      .then(a => { aRef.current = a; return createGCounter(1, 2) })
      .then(b => { bRef.current = b; setReady(true) })
      .catch(e => setError(String(e)))

    return () => {
      aRef.current?.delete()
      bRef.current?.delete()
    }
  }, [])

  function syncA() {
    if (!aRef.current || !bRef.current) return
    aRef.current.merge(bRef.current)
    setAState(readState(aRef.current))
  }

  function syncB() {
    if (!aRef.current || !bRef.current) return
    bRef.current.merge(aRef.current)
    setBState(readState(bRef.current))
  }

  function syncBoth() {
    if (!aRef.current || !bRef.current) return
    aRef.current.merge(bRef.current)
    bRef.current.merge(aRef.current)
    setAState(readState(aRef.current))
    setBState(readState(bRef.current))
  }

  function incrementA() {
    if (!aRef.current) return
    aRef.current.increment(1)
    setAState(readState(aRef.current))
  }

  function incrementB() {
    if (!bRef.current) return
    bRef.current.increment(1)
    setBState(readState(bRef.current))
  }

  const inSync =
    aState.slots[0] === bState.slots[0] &&
    aState.slots[1] === bState.slots[1]

  if (error) return (
    <div className="flex items-center justify-center min-h-screen text-destructive">
      Failed to load WASM module: {error}
    </div>
  )

  return (
    <div className="flex flex-col items-center min-h-screen gap-8 p-8">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
        <h1 className="text-2xl font-bold">G-Counter</h1>
        <div className="w-16" />
      </div>

      <p className="text-muted-foreground text-sm max-w-md text-center">
        Each node only increments its own slot. Merge takes the element-wise max.
        Nodes diverge until they exchange state.
      </p>

      {!ready ? (
        <p className="text-muted-foreground">Loading WASM module...</p>
      ) : (
        <>
          <div className="flex gap-6 w-full max-w-2xl">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="text-center">Node A</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="text-5xl font-mono font-bold">{aState.value}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  [{aState.slots[0]}, {aState.slots[1]}]
                </div>
                <Button onClick={incrementA} className="w-full">+ Increment</Button>
                <Button onClick={syncA} variant="outline" className="w-full">
                  ↙ Merge from B
                </Button>
              </CardContent>
            </Card>

            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="text-center">Node B</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="text-5xl font-mono font-bold">{bState.value}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  [{bState.slots[0]}, {bState.slots[1]}]
                </div>
                <Button onClick={incrementB} className="w-full">+ Increment</Button>
                <Button onClick={syncB} variant="outline" className="w-full">
                  ↘ Merge from A
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Button onClick={syncBoth} variant="secondary" size="lg">
              ⇄ Sync Both
            </Button>
            <span className={`text-xs font-medium ${inSync ? 'text-green-500' : 'text-amber-500'}`}>
              {inSync ? 'Nodes are in sync' : 'Nodes have diverged'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
