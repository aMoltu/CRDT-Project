import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createGSet, type GSetHandle, type LineSegment } from '@/lib/crdt'

const COLORS = {
  A: { r: 200,  g: 100, b: 100 },
  B: { r: 100, g: 100,  b: 200 },
}

const WIDTH = 4

interface DrawState {
  segments: LineSegment[]
}

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
  state: DrawState
  onDraw: (seg: LineSegment) => void
  color: { r: number; g: number; b: number }
  onMerge: () => void
  mergeLabel: string
  disabled: boolean
}

function NodeCanvas({ label, state, onDraw, color, onMerge, mergeLabel, disabled }: NodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

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
    onDraw({
      x1: last.current.x, y1: last.current.y,
      x2: pos.x,          y2: pos.y,
      r: color.r, g: color.g, b: color.b,
      width: WIDTH,
    })
    last.current = pos
  }

  function onMouseUp() {
    drawing.current = false
    last.current = null
  }

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="text-center">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <canvas
          ref={canvasRef}
          width={320}
          height={280}
          className="border border-border rounded-md cursor-crosshair bg-background"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
        <div className="text-xs text-muted-foreground font-mono">
          {state.segments.length} segment{state.segments.length !== 1 ? 's' : ''}
        </div>
        <Button onClick={onMerge} variant="outline" className="w-full" disabled={disabled}>
          {mergeLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function GSetDemo() {
  const navigate = useNavigate()
  const aRef = useRef<GSetHandle | null>(null)
  const bRef = useRef<GSetHandle | null>(null)

  const [aState, setAState] = useState<DrawState>({ segments: [] })
  const [bState, setBState] = useState<DrawState>({ segments: [] })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    createGSet()
      .then(a => { aRef.current = a; return createGSet() })
      .then(b => { bRef.current = b; setReady(true) })
      .catch(e => setError(String(e)))

    return () => {
      aRef.current?.delete()
      bRef.current?.delete()
    }
  }, [])

  const drawA = useCallback((seg: LineSegment) => {
    if (!aRef.current) return
    aRef.current.insert(seg)
    setAState(readState(aRef.current))
  }, [])

  const drawB = useCallback((seg: LineSegment) => {
    if (!bRef.current) return
    bRef.current.insert(seg)
    setBState(readState(bRef.current))
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

  const inSync = aState.segments.length === bState.segments.length

  if (error) return (
    <div className="flex items-center justify-center min-h-screen text-destructive">
      Failed to load WASM module: {error}
    </div>
  )

  return (
    <div className="flex flex-col items-center min-h-screen gap-8 p-8">
      <div className="flex items-center justify-between w-full max-w-3xl">
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
          <div className="flex gap-6 w-full max-w-3xl">
            <NodeCanvas
              label="Node A"
              state={aState}
              onDraw={drawA}
              color={COLORS.A}
              onMerge={syncA}
              mergeLabel="↙ Merge from B"
              disabled={!ready}
            />
            <NodeCanvas
              label="Node B"
              state={bState}
              onDraw={drawB}
              color={COLORS.B}
              onMerge={syncB}
              mergeLabel="↘ Merge from A"
              disabled={!ready}
            />
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
