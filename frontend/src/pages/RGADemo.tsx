import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createRGA, type RGAHandle } from '@/lib/crdt'

const N = 3
const LABELS = ['A', 'B', 'C'] as const

export default function RGADemo() {
  const navigate = useNavigate()
  const refs = useRef<(RGAHandle | null)[]>([null, null, null])
  const textareaRefs = [
    useRef<HTMLTextAreaElement>(null),
    useRef<HTMLTextAreaElement>(null),
    useRef<HTMLTextAreaElement>(null),
  ]
  const [texts, setTexts] = useState<string[]>(['', '', ''])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function refresh() {
    setTexts(refs.current.map(r => r ? r.text() : ''))
  }

  function refreshNode(i: number) {
    setTexts(prev => {
      const next = [...prev]
      const r = refs.current[i]
      if (r) next[i] = r.text()
      return next
    })
  }

  useEffect(() => {
    Promise.all(Array.from({ length: N }, (_, i) => createRGA(i)))
      .then(rgas => {
        refs.current = rgas
        setTexts(rgas.map(r => r.text()))
        setReady(true)
      })
      .catch(e => setError(String(e)))
    return () => { refs.current.forEach(r => r?.delete()) }
  }, [])

  function deleteRange(rga: RGAHandle, from: number, to: number) {
    for (let k = to - 1; k >= from; k--)
      rga.remove_at(k)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, i: number) {
    const rga = refs.current[i]
    if (!rga) return

    const el = e.currentTarget
    const start = el.selectionStart ?? 0
    const end   = el.selectionEnd   ?? 0
    const hasSelection = start !== end

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      if (hasSelection) {
        deleteRange(rga, start, end)
        refreshNode(i)
        requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start })
      } else if (e.key === 'Backspace') {
        if (start === 0) return
        rga.remove_at(start - 1)
        refreshNode(i)
        requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start - 1 })
      } else {
        rga.remove_at(start)
        refreshNode(i)
        requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start })
      }

    } else {
      const char = e.key === 'Enter' ? '\n' : (e.key.length === 1 ? e.key : null)
      if (!char || e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()
      let pos = start
      if (hasSelection) {
        deleteRange(rga, start, end)
        pos = start
      }
      rga.insert(rga.left_node_id_at(pos - 1), rga.left_seq_at(pos - 1), char)
      refreshNode(i)
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = pos + 1 })
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>, i: number) {
    e.preventDefault()
    const rga = refs.current[i]
    if (!rga) return

    const el = e.currentTarget
    const start = el.selectionStart ?? 0
    const end   = el.selectionEnd   ?? 0

    const text = e.clipboardData.getData('text')
    if (!text) return

    let pos = start
    if (start !== end) {
      deleteRange(rga, start, end)
      pos = start
    }

    for (const char of text) {
      rga.insert(rga.left_node_id_at(pos - 1), rga.left_seq_at(pos - 1), char)
      pos++
    }

    refreshNode(i)
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = pos })
  }

  function mergeInto(target: number, source: number) {
    const t = refs.current[target]
    const s = refs.current[source]
    if (t && s) { t.merge(s); refresh() }
  }

  function syncAll() {
    const live = refs.current.filter(Boolean) as RGAHandle[]
    if (live.length < N) return
    for (let pass = 0; pass < 2; pass++)
      for (const t of live)
        for (const s of live)
          if (t !== s) t.merge(s)
    refresh()
  }

  async function reset() {
    refs.current.forEach(r => r?.delete())
    refs.current = [null, null, null]
    setTexts(['', '', ''])
    setReady(false)
    try {
      const rgas = await Promise.all(Array.from({ length: N }, (_, i) => createRGA(i)))
      refs.current = rgas
      setTexts(rgas.map(r => r.text()))
      setReady(true)
    } catch (e) {
      setError(String(e))
    }
  }

  const inSync = texts.every(t => t === texts[0])

  if (error) return (
    <div className="flex items-center justify-center min-h-screen text-destructive">
      Failed to load WASM module: {error}
    </div>
  )

  return (
    <div className="flex flex-col items-center min-h-screen gap-8 p-8">
      <div className="flex items-center justify-between w-full max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
        <h1 className="text-2xl font-bold">RGA Text Editor</h1>
        <div className="w-16" />
      </div>

      <p className="text-muted-foreground text-sm max-w-lg text-center">
        Each node edits its own copy independently. Characters get stable unique IDs so
        concurrent inserts can be merged without conflicts. When two nodes insert at the
        same position, the more recently typed text comes first, determined by a Lamport
        clock. Diverge the nodes, then sync.
      </p>

      {!ready ? (
        <p className="text-muted-foreground">Loading WASM module...</p>
      ) : (
        <>
          <div className="flex gap-4 w-full max-w-4xl">
            {([0, 1, 2] as const).map(i => (
              <Card key={i} className="flex-1">
                <CardHeader>
                  <CardTitle className="text-center">Node {LABELS[i]}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <textarea
                    ref={textareaRefs[i]}
                    value={texts[i]}
                    onChange={() => {}}
                    onKeyDown={e => handleKeyDown(e, i)}
                    onPaste={e => handlePaste(e, i)}
                    rows={10}
                    className="w-full resize-none rounded-md border border-border bg-background p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder={`Type here as Node ${LABELS[i]}…`}
                    spellCheck={false}
                  />
                  <div className="text-xs text-muted-foreground font-mono text-center">
                    {texts[i].length} char{texts[i].length !== 1 ? 's' : ''}
                  </div>
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
