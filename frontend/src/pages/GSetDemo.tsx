import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createGSet, type GSetHandle, type LineSegment } from '@/lib/crdt'

const N = 3
const LABELS = ['A', 'B', 'C'] as const
const COLORS = [
  { r: 200, g: 80,  b: 80  },  // red
  { r: 80,  g: 80,  b: 200 },  // blue
  { r: 80,  g: 180, b: 80  },  // green
]
const WIDTH = 4

interface DrawState { segments: LineSegment[] }
const EMPTY: DrawState = { segments: [] }

function readState(set: GSetHandle): DrawState {
  const vec = set.state()
  const segments: LineSegment[] = []
  const n = vec.size()
  for (let i = 0; i < n; i++) segments.push(vec.get(i))
  vec.delete()
  return { segments }
}

function redraw(canvas: HTMLCanvasElement, segments: LineSegment[]) {
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  for (const s of segments) {
    ctx.beginPath()
    ctx.moveTo(s.x1, s.y1)
    ctx.lineTo(s.x2, s.y2)
    ctx.strokeStyle = `rgb(${s.r},${s.g},${s.b})`
    ctx.lineWidth = s.width
    ctx.lineCap = 'round'
    ctx.stroke()
  }
}

interface NodeCanvasProps {
  label: string
  nodeIndex: number
  state: DrawState
  onDraw: (i: number, seg: LineSegment) => void
  onMerge: (target: number, source: number) => void
  disabled: boolean
}

function NodeCanvas({ label, nodeIndex: i, state, onDraw, onMerge, disabled }: NodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const color = COLORS[i]

  useEffect(() => {
    if (canvasRef.current) redraw(canvasRef.current, state.segments)
  }, [state])

  function getPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    drawing.current = true
    last.current = getPos(e)
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return
    const pos = getPos(e)
    onDraw(i, {
      x1: last.current.x, y1: last.current.y,
      x2: pos.x,          y2: pos.y,
      r: color.r, g: color.g, b: color.b,
      width: WIDTH,
    })
    last.current = pos
  }

  function onMouseUp() { drawing.current = false; last.current = null }

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="text-center">Node {label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <canvas
          ref={canvasRef}
          width={240}
          height={180}
          className="border border-border rounded-md cursor-crosshair bg-background"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
        <div className="text-xs text-muted-foreground font-mono">
          {state.segments.length} segment{state.segments.length !== 1 ? 's' : ''}
        </div>
        {([0, 1, 2] as const).filter(j => j !== i).map(j => (
          <Button key={j} onClick={() => onMerge(i, j)} variant="outline" className="w-full" disabled={disabled}>
            Merge from {LABELS[j]}
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}

export default function GSetDemo() {
  const navigate = useNavigate()
  const refs = useRef<(GSetHandle | null)[]>([null, null, null])
  const [states, setStates] = useState<DrawState[]>([EMPTY, EMPTY, EMPTY])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function refresh() {
    setStates(refs.current.map(r => r ? readState(r) : EMPTY))
  }

  useEffect(() => {
    Promise.all(Array.from({ length: N }, () => createGSet()))
      .then(sets => {
        refs.current = sets
        setStates(sets.map(readState))
        setReady(true)
      })
      .catch(e => setError(String(e)))
    return () => { refs.current.forEach(r => r?.delete()) }
  }, [])

  const draw = useCallback((i: number, seg: LineSegment) => {
    refs.current[i]?.insert(seg)
    setStates(prev => {
      const next = [...prev]
      const r = refs.current[i]
      if (r) next[i] = readState(r)
      return next
    })
  }, [])

  function mergeInto(target: number, source: number) {
    const t = refs.current[target]
    const s = refs.current[source]
    if (t && s) { t.merge(s); refresh() }
  }

  function syncAll() {
    const live = refs.current.filter(Boolean) as GSetHandle[]
    if (live.length < N) return
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
      const sets = await Promise.all(Array.from({ length: N }, () => createGSet()))
      refs.current = sets
      setStates(sets.map(readState))
      setReady(true)
    } catch (e) {
      setError(String(e))
    }
  }

  const inSync = states.every(s => s.segments.length === states[0].segments.length)

  if (error) return (
    <div className="flex items-center justify-center min-h-screen text-destructive">
      Failed to load WASM module: {error}
    </div>
  )

  return (
    <div className="flex flex-col items-center min-h-screen gap-4 p-4">
      <div className="flex items-center justify-between w-full max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
        <h1 className="text-2xl font-bold">G-Set Canvas</h1>
        <div className="w-16" />
      </div>

      <p className="text-muted-foreground text-sm max-w-md text-center">
        Each node accumulates strokes independently. Merge copies all strokes from the
        other node — a G-Set only grows, never shrinks.
      </p>

      {!ready ? (
        <p className="text-muted-foreground">Loading WASM module...</p>
      ) : (
        <>
          <div className="flex gap-4 w-full max-w-4xl">
            {([0, 1, 2] as const).map(i => (
              <NodeCanvas
                key={i}
                label={LABELS[i]}
                nodeIndex={i}
                state={states[i]}
                onDraw={draw}
                onMerge={mergeInto}
                disabled={!ready}
              />
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
