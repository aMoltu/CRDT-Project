import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createGSet, type GSetHandle, type LineSegment } from '@/lib/crdt'
import { ConnectionBar } from '@/components/RoomBanner'
import { useConnection } from '@/lib/room'

const MY_COLOR = { r: 200, g: 80, b: 80 }
const WIDTH = 4

function readSegments(set: GSetHandle): LineSegment[] {
  const vec = set.state()
  const out: LineSegment[] = []
  const n = vec.size()
  for (let i = 0; i < n; i++) out.push(vec.get(i))
  vec.delete()
  return out
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

export default function GSetOnline() {
  const navigate = useNavigate()
  const connection = useConnection()
  const gset = useRef<GSetHandle | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [segmentCount, setSegmentCount] = useState(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    createGSet()
      .then(s => { gset.current = s; setReady(true) })
      .catch(e => setError(String(e)))
    return () => { gset.current?.delete() }
  }, [])

  const addSegment = useCallback((seg: LineSegment) => {
    const s = gset.current
    if (!s) return
    s.insert(seg)
    const segs = readSegments(s)
    setSegmentCount(segs.length)
    if (canvasRef.current) redraw(canvasRef.current, segs)
    // TODO: room.send({ type: 'gset_insert', seg })
  }, [])

  // TODO: room.onOp(op => {
  //   if (op.type === 'gset_insert') addSegment(op.seg)
  // })

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
    addSegment({
      x1: last.current.x, y1: last.current.y,
      x2: pos.x,          y2: pos.y,
      r: MY_COLOR.r, g: MY_COLOR.g, b: MY_COLOR.b,
      width: WIDTH,
    })
    last.current = pos
  }

  function onMouseUp() { drawing.current = false; last.current = null }

  if (error) return (
    <div className="flex items-center justify-center min-h-screen text-destructive">
      Failed to load WASM module: {error}
    </div>
  )

  return (
    <div className="flex flex-col items-center min-h-screen gap-6 p-8">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
        <h1 className="text-2xl font-bold">G-Set Canvas — Online</h1>
        <div className="w-16" />
      </div>

      <ConnectionBar connection={connection} />

      <p className="text-muted-foreground text-sm max-w-md text-center">
        Draw on the canvas. When connected, strokes from other users appear automatically.
        The G-Set only grows — strokes can never be removed.
      </p>

      {!ready ? (
        <p className="text-muted-foreground">Loading WASM module…</p>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-4 pb-4">
            <canvas
              ref={canvasRef}
              width={480}
              height={360}
              className="border border-border rounded-md cursor-crosshair bg-background"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            />
            <div className="text-xs text-muted-foreground font-mono">
              {segmentCount} segment{segmentCount !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
