import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createRGA, type RGAHandle } from '@/lib/crdt'
import { ConnectionBar } from '@/components/RoomBanner'
import { useConnection } from '@/lib/room'

export default function RGAOnline() {
  const navigate = useNavigate()
  const connection = useConnection()
  const ref = useRef<RGAHandle | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // The server will assign a real nodeId on connect.
    // nodeId=0 is a stub for offline use.
    createRGA(0)
      .then(rga => { ref.current = rga; setText(rga.text()); setReady(true) })
      .catch(e => setError(String(e)))
    return () => { ref.current?.delete() }
  }, [])

  // TODO: room.onOp(op => {
  //   if (op.type === 'rga_insert') ref.current?.insert_with_id(op.leftNodeId, op.leftSeq, op.char, op.nodeId, op.seq, op.lamport)
  //   if (op.type === 'rga_remove') ref.current?.remove_by_id(op.nodeId, op.seq)
  //   setText(ref.current?.text() ?? '')
  // })
  // Note: insert_with_id and remove_by_id need to be added to the C++ WASM bindings.

  function deleteRange(rga: RGAHandle, from: number, to: number) {
    for (let k = to - 1; k >= from; k--)
      rga.remove_at(k)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const rga = ref.current
    if (!rga) return
    const el = e.currentTarget
    const start = el.selectionStart ?? 0
    const end   = el.selectionEnd   ?? 0
    const hasSel = start !== end

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      if (hasSel) {
        deleteRange(rga, start, end)
        setText(rga.text())
        requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start })
      } else if (e.key === 'Backspace') {
        if (start === 0) return
        rga.remove_at(start - 1)
        setText(rga.text())
        requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start - 1 })
      } else {
        rga.remove_at(start)
        setText(rga.text())
        requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start })
      }
      // TODO: room.send remove op(s)
    } else {
      const char = e.key === 'Enter' ? '\n' : (e.key.length === 1 ? e.key : null)
      if (!char || e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()
      let pos = start
      if (hasSel) { deleteRange(rga, start, end); pos = start }
      rga.insert(rga.left_node_id_at(pos - 1), rga.left_seq_at(pos - 1), char)
      setText(rga.text())
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = pos + 1 })
      // TODO: room.send insert op (needs insert_with_id return value from WASM)
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    e.preventDefault()
    const rga = ref.current
    if (!rga) return
    const el = e.currentTarget
    const start = el.selectionStart ?? 0
    const end   = el.selectionEnd   ?? 0
    const pasted = e.clipboardData.getData('text')
    if (!pasted) return
    let pos = start
    if (start !== end) { deleteRange(rga, start, end); pos = start }
    for (const char of pasted) {
      rga.insert(rga.left_node_id_at(pos - 1), rga.left_seq_at(pos - 1), char)
      pos++
    }
    setText(rga.text())
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = pos })
    // TODO: room.send insert ops
  }

  if (error) return (
    <div className="flex items-center justify-center min-h-screen text-destructive">
      Failed to load WASM module: {error}
    </div>
  )

  return (
    <div className="flex flex-col items-center min-h-screen gap-6 p-8">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
        <h1 className="text-2xl font-bold">RGA Text Editor — Online</h1>
        <div className="w-16" />
      </div>

      <ConnectionBar connection={connection} />

      <p className="text-muted-foreground text-sm max-w-lg text-center">
        Edit the document. When connected, other users' keystrokes appear automatically via
        operation-based RGA sync — each character has a stable unique ID so concurrent edits
        merge without conflicts.
      </p>

      {!ready ? (
        <p className="text-muted-foreground">Loading WASM module…</p>
      ) : (
        <Card className="w-full max-w-2xl">
          <CardContent className="flex flex-col gap-2 pt-4 pb-4">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={() => {}}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              rows={16}
              className="w-full resize-none rounded-md border border-border bg-background p-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Start typing…"
              spellCheck={false}
            />
            <div className="text-xs text-muted-foreground font-mono text-right">
              {text.length} char{text.length !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
