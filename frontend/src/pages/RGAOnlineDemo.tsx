import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { loadModule, type WasmModule } from '@/lib/wasm-loader'
import type { RGAHandle } from '@/lib/crdt'
import { ConnectionBar } from '@/components/RoomBanner'
import { useConnection } from '@/lib/room'

interface RGAChar { n: number; s: number; l: number; ln: number; ls: number; v: string; d: boolean }
interface InitMsg   { type: 'rga_init';   node_id: number; chars: RGAChar[] }
interface InsertMsg { type: 'rga_insert'; left_node_id: number; left_seq: number; char: string; node_id: number; seq: number; lamport: number }
interface RemoveMsg { type: 'rga_remove'; node_id: number; seq: number }
type RGAMsg = InitMsg | InsertMsg | RemoveMsg

export default function RGAOnline() {
  const navigate = useNavigate()
  const ref       = useRef<RGAHandle | null>(null)
  const moduleRef = useRef<WasmModule | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText]   = useState('')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadModule()
      .then(m => { moduleRef.current = m })
      .catch(e => setError(String(e)))
    return () => { ref.current?.delete() }
  }, [])

  const onMessage = useCallback((raw: unknown) => {
    const msg = raw as RGAMsg
    const M   = moduleRef.current
    if (!M) return

    if (msg.type === 'rga_init') {
      ref.current?.delete()
      const rga = new M.RGA(msg.node_id) as RGAHandle
      ref.current = rga
      for (const c of msg.chars) {
        rga.insert_remote(c.ln, c.ls, c.v, c.n, c.s, c.l)
        if (c.d) rga.remove_by_id(c.n, c.s)
      }
      setText(rga.text())
      setReady(true)
      return
    }

    const rga = ref.current
    if (!rga) return

    if (msg.type === 'rga_insert') {
      rga.insert_remote(msg.left_node_id, msg.left_seq, msg.char, msg.node_id, msg.seq, msg.lamport)
    } else if (msg.type === 'rga_remove') {
      rga.remove_by_id(msg.node_id, msg.seq)
    }
    setText(rga.text())
  }, [])

  const connection = useConnection('/rga', onMessage)

  function deleteRange(rga: RGAHandle, from: number, to: number) {
    for (let k = to - 1; k >= from; k--) {
      const nid = rga.node_id_at(k)
      const seq = rga.seq_at(k)
      rga.remove_at(k)
      connection.send({ type: 'rga_remove', node_id: nid, seq })
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const rga = ref.current
    if (!rga || !ready) return
    const el    = e.currentTarget
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
        const nid = rga.node_id_at(start - 1)
        const seq = rga.seq_at(start - 1)
        rga.remove_at(start - 1)
        setText(rga.text())
        connection.send({ type: 'rga_remove', node_id: nid, seq })
        requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start - 1 })
      } else {
        const nid = rga.node_id_at(start)
        const seq = rga.seq_at(start)
        rga.remove_at(start)
        setText(rga.text())
        connection.send({ type: 'rga_remove', node_id: nid, seq })
        requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start })
      }
    } else {
      const char = e.key === 'Enter' ? '\n' : (e.key.length === 1 ? e.key : null)
      if (!char || e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()
      let pos = start
      if (hasSel) { deleteRange(rga, start, end); pos = start }
      rga.insert(rga.left_node_id_at(pos - 1), rga.left_seq_at(pos - 1), char)
      connection.send({
        type: 'rga_insert',
        left_node_id: rga.left_node_id_at(pos - 1),
        left_seq:     rga.left_seq_at(pos - 1),
        char,
        node_id: rga.get_node_id(),
        seq:     rga.last_insert_seq(),
        lamport: rga.last_insert_lamport(),
      })
      setText(rga.text())
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = pos + 1 })
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    e.preventDefault()
    const rga = ref.current
    if (!rga || !ready) return
    const el    = e.currentTarget
    const start = el.selectionStart ?? 0
    const end   = el.selectionEnd   ?? 0
    const pasted = e.clipboardData.getData('text')
    if (!pasted) return
    let pos = start
    if (start !== end) { deleteRange(rga, start, end); pos = start }
    for (const char of pasted) {
      const leftNid = rga.left_node_id_at(pos - 1)
      const leftSeq = rga.left_seq_at(pos - 1)
      rga.insert(leftNid, leftSeq, char)
      connection.send({
        type: 'rga_insert',
        left_node_id: leftNid,
        left_seq:     leftSeq,
        char,
        node_id: rga.get_node_id(),
        seq:     rga.last_insert_seq(),
        lamport: rga.last_insert_lamport(),
      })
      pos++
    }
    setText(rga.text())
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = pos })
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
        Edit the document. Other users' keystrokes appear automatically. Disconnect to
        simulate a network partition — your edits are queued locally. Reconnect to
        converge.
      </p>

      {connection.status === 'offline' ? (
        <p className="text-muted-foreground">Connecting to server…</p>
      ) : !ready ? (
        <p className="text-muted-foreground">Waiting for server state…</p>
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
