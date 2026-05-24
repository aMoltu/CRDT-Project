import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createGCounter, type GCounterHandle } from '@/lib/crdt'

const N = 3
const LABELS = ['A', 'B', 'C'] as const

interface NodeState {
  value: number
  slots: [number, number, number]
}

const EMPTY: NodeState = { value: 0, slots: [0, 0, 0] }

function readState(c: GCounterHandle): NodeState {
  return {
    value: c.value(),
    slots: [c.slot(0), c.slot(1), c.slot(2)],
  }
}

export default function GCounterDemo() {
  const navigate = useNavigate()
  const refs = useRef<(GCounterHandle | null)[]>([null, null, null])
  const [states, setStates] = useState<NodeState[]>([EMPTY, EMPTY, EMPTY])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function refresh() {
    setStates(refs.current.map(r => r ? readState(r) : EMPTY))
  }

  useEffect(() => {
    Promise.all(Array.from({ length: N }, (_, i) => createGCounter(i, N)))
      .then(counters => {
        refs.current = counters
        setStates(counters.map(readState))
        setReady(true)
      })
      .catch(e => setError(String(e)))
    return () => { refs.current.forEach(r => r?.delete()) }
  }, [])

  function increment(i: number) {
    refs.current[i]?.increment(1)
    refresh()
  }

  function mergeInto(target: number, source: number) {
    const t = refs.current[target]
    const s = refs.current[source]
    if (t && s) { t.merge(s); refresh() }
  }

  function syncAll() {
    const live = refs.current.filter(Boolean) as GCounterHandle[]
    if (live.length < N) return
    // two rounds ensures full convergence regardless of order
    for (let pass = 0; pass < 2; pass++)
      for (const t of live)
        for (const s of live)
          if (t !== s) t.merge(s)
    refresh()
  }

  async function reset() {
    refs.current.forEach(r => r?.delete())
    refs.current = [null, null, null]
    setStates([EMPTY, EMPTY, EMPTY])
    setReady(false)
    try {
      const counters = await Promise.all(Array.from({ length: N }, (_, i) => createGCounter(i, N)))
      refs.current = counters
      setStates(counters.map(readState))
      setReady(true)
    } catch (e) {
      setError(String(e))
    }
  }

  const inSync = states.every(s =>
    s.slots.every((v, i) => v === states[0].slots[i])
  )

  if (error) return (
    <div className="flex items-center justify-center min-h-screen text-destructive">
      Failed to load WASM module: {error}
    </div>
  )

  return (
    <div className="flex flex-col items-center min-h-screen gap-4 p-4">
      <div className="flex items-center justify-between w-full max-w-3xl">
        <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
        <h1 className="text-2xl font-bold">G-Counter</h1>
        <div className="w-16" />
      </div>

      <p className="text-muted-foreground text-sm max-w-md text-center">
        Each node can only increment its own slot in the counter. When two nodes merge,
        each slot keeps its highest value, so no increment is ever lost. Try incrementing
        different nodes, then merge them to see the counts combine.
      </p>

      {!ready ? (
        <p className="text-muted-foreground">Loading WASM module...</p>
      ) : (
        <>
          <div className="flex gap-4 w-full max-w-3xl">
            {([0, 1, 2] as const).map(i => (
              <Card key={i} className="flex-1">
                <CardHeader>
                  <CardTitle className="text-center">Node {LABELS[i]}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-3">
                  <div className="text-5xl font-mono font-bold">{states[i].value}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    [{states[i].slots.join(', ')}]
                  </div>
                  <Button onClick={() => increment(i)} className="w-full">+ Increment</Button>
                  {([0, 1, 2] as const).filter(j => j !== i).map(j => (
                    <Button key={j} onClick={() => mergeInto(i, j)} variant="outline" className="w-full">
                      Merge from {LABELS[j]}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-3">
              <Button onClick={syncAll} variant="secondary" size="lg">⇄ Sync All</Button>
              <Button onClick={reset} variant="outline" size="lg">↺ Reset</Button>
            </div>
            <span className={`text-xs font-medium ${inSync ? 'text-green-500' : 'text-amber-500'}`}>
              {inSync ? 'Nodes are in sync' : 'Nodes have diverged'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
