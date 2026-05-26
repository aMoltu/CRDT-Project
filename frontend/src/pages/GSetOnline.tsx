import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { LineSegment } from '@/lib/crdt'
import { ConnectionBar } from '@/components/RoomBanner'
import { useConnection } from '@/lib/room'

const WIDTH = 4

function randomColor() {
  const h = Math.random()
  const s = 0.75, v = 0.85
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s)
  let r: number, g: number, b: number
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    default: r = v; g = p; b = q; break
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
}

interface InitMsg   { type: 'gset_init';   segments: LineSegment[] }
interface InsertMsg { type: 'gset_insert'; seg: LineSegment }
interface ResetMsg  { type: 'gset_reset' }
type GSetMsg = InitMsg | InsertMsg | ResetMsg

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
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const segments   = useRef<LineSegment[]>([])
  const drawing    = useRef(false)
  const last       = useRef<{ x: number; y: number } | null>(null)
  const [myColor]  = useState(randomColor)
  const [count, setCount] = useState(0)
  const [ready, setReady] = useState(false)

  function repaint() {
    if (canvasRef.current) redraw(canvasRef.current, segments.current)
    setCount(segments.current.length)
  }

  const onMessage = useCallback((raw: unknown) => {
    const msg = raw as GSetMsg
    if (msg.type === 'gset_init') {
      segments.current = msg.segments
      setReady(true)
      repaint()
    } else if (msg.type === 'gset_insert') {
      segments.current = [...segments.current, msg.seg]
      repaint()
    } else if (msg.type === 'gset_reset') {
      segments.current = []
      repaint()
    }
  }, [])

  const connection = useConnection('/gset', onMessage)

  useEffect(() => { if (ready) repaint() }, [ready])

  function getPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function addSegment(seg: LineSegment) {
    segments.current = [...segments.current, seg]
    repaint()
    connection.send({ type: 'gset_insert', seg })
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) { drawing.current = true; last.current = getPos(e) }
  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return
    const pos = getPos(e)
    const { r, g, b } = myColor
    addSegment({ x1: last.current.x, y1: last.current.y, x2: pos.x, y2: pos.y, r, g, b, width: WIDTH })
    last.current = pos
  }
  function onMouseUp() { drawing.current = false; last.current = null }

  function reset() {
    segments.current = []
    repaint()
    connection.send({ type: 'gset_reset' })
  }

  return (
    <div className="flex flex-col items-center min-h-screen gap-4 p-4">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
        <h1 className="text-2xl font-bold">G-Set Canvas — Online</h1>
        <div className="w-16" />
      </div>

      <ConnectionBar connection={connection} />

      <p className="text-muted-foreground text-sm max-w-md text-center">
        Draw on the canvas and your strokes will appear for other users automatically.
        Disconnect to draw without syncing, then reconnect to see all strokes combined.
      </p>

      {!ready ? (
        <p className="text-muted-foreground">
          {connection.status === 'offline' ? 'Connecting to server…' : 'Waiting for server state…'}
        </p>
      ) : (
        <>
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
              <div className="flex items-center gap-3 w-full justify-between px-1">
                <div className="text-xs text-muted-foreground font-mono">
                  {count} segment{count !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Your colour
                  <span
                    className="inline-block w-3 h-3 rounded-full border border-border"
                    style={{ backgroundColor: `rgb(${myColor.r},${myColor.g},${myColor.b})` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          <Button onClick={reset} variant="outline">↺ Reset for everyone</Button>
        </>
      )}
    </div>
  )
}
